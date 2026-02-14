package main

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/giulianopz/go-readability"
	"github.com/yosssi/gohtml"
)

func main() {
	listener, listenerSource, err := activationListener()
	if err != nil {
		log.Fatal(err)
	}

	client := &http.Client{
		Timeout: 20 * time.Second,
	}

	var (
		server   *http.Server
		stopOnce sync.Once
	)

	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		defer stopOnce.Do(func() {
			go gracefulShutdown(server)
		})
		cleanHandler(w, r, client)
	})

	server = &http.Server{
		Handler:           mux,
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       1 * time.Second,
	}

	log.Printf("serving on %s", listenerSource)
	if err := server.Serve(listener); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}

func cleanHandler(w http.ResponseWriter, r *http.Request, client *http.Client) {
	w.Header().Set("Connection", "close")

	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	rawURL := r.URL.Query().Get("url")
	if rawURL == "" {
		http.Error(w, "missing query parameter: url", http.StatusBadRequest)
		return
	}

	targetURL, err := url.ParseRequestURI(rawURL)
	if err != nil || targetURL.Scheme != "https" || targetURL.Host == "" {
		http.Error(w, "url must be a valid HTTPS URL", http.StatusBadRequest)
		return
	}

	fragment, err := extractCleanFragment(client, targetURL.String())
	if err != nil {
		http.Error(w, fmt.Sprintf("extract failed: %v", err), http.StatusBadGateway)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write([]byte(fragment))
}

func extractCleanFragment(client *http.Client, targetURL string) (string, error) {
	req, err := http.NewRequest(http.MethodGet, targetURL, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", "reader-extractor/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return "", fmt.Errorf("upstream returned %s", resp.Status)
	}

	source, err := io.ReadAll(io.LimitReader(resp.Body, 10<<20))
	if err != nil {
		return "", err
	}

	reader, err := readability.New(
		string(source),
		targetURL,
		readability.ClassesToPreserve("caption"),
	)
	if err != nil {
		return "", err
	}

	result, err := reader.Parse()
	if err != nil {
		return "", err
	}

	return gohtml.Format(result.HTMLContent), nil
}

func gracefulShutdown(server *http.Server) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	_ = server.Shutdown(ctx)
}

func activationListener() (net.Listener, string, error) {
	pid, err := strconv.Atoi(os.Getenv("LISTEN_PID"))
	if err == nil && pid == os.Getpid() && os.Getenv("LISTEN_FDS") == "1" {
		file := os.NewFile(uintptr(3), "systemd-socket")
		if file == nil {
			return nil, "", fmt.Errorf("systemd socket activation failed: fd 3 missing")
		}
		listener, err := net.FileListener(file)
		_ = file.Close()
		if err != nil {
			return nil, "", fmt.Errorf("systemd socket activation failed: %w", err)
		}
		return listener, "systemd socket fd 3", nil
	}

	addr := os.Getenv("LISTEN_ADDR")
	if addr == "" {
		addr = "127.0.0.1:8080"
	}
	listener, err := net.Listen("tcp", addr)
	if err != nil {
		return nil, "", err
	}
	return listener, "tcp " + addr, nil
}

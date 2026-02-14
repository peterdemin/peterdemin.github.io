package main

import (
	"context"
	_ "embed"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/giulianopz/go-readability"
	"github.com/yosssi/gohtml"
)

const contentPlaceholder = "{{CONTENT}}"

//go:embed reader.html
var readerTemplate string

func main() {
	var addr = flag.String("addr", "", "TCP listen address, instead of systemd socket activation")
	flag.Parse()

	pagePrefix, pageSuffix, err := splitTemplate(readerTemplate, contentPlaceholder)
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
		cleanHandler(w, r, client, pagePrefix, pageSuffix)
	})
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	server = &http.Server{
		Handler:           mux,
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       1 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()
	serveDone := make(chan error, 1)

	if *addr != "" {
		server.Addr = *addr
		log.Printf("listening on %s (tcp)", *addr)
		go func() {
			serveDone <- server.ListenAndServe()
		}()
	} else {
		listener, err := systemdListener()
		if err != nil {
			log.Fatal(err)
		}
		log.Printf("listening on systemd activation socket")
		go func() {
			serveDone <- server.Serve(listener)
		}()
	}

	select {
	case err := <-serveDone:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatal(err)
		}
	case <-ctx.Done():
		stop()
		gracefulShutdown(server)
		err := <-serveDone
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatal(err)
		}
	}
}

func cleanHandler(w http.ResponseWriter, r *http.Request, client *http.Client, pagePrefix string, pageSuffix string) {
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
	_, _ = io.WriteString(w, pagePrefix)
	_, _ = io.WriteString(w, fragment)
	_, _ = io.WriteString(w, pageSuffix)
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

func systemdListener() (net.Listener, error) {
	lp := os.Getenv("LISTEN_PID")
	lf := os.Getenv("LISTEN_FDS")
	if lp == "" || lf == "" {
		return nil, fmt.Errorf("not socket-activated: LISTEN_PID/LISTEN_FDS missing")
	}
	pid, err := strconv.Atoi(lp)
	if err != nil || pid != os.Getpid() {
		return nil, fmt.Errorf("LISTEN_PID=%q does not match pid=%d", lp, os.Getpid())
	}
	n, err := strconv.Atoi(lf)
	if err != nil || n < 1 {
		return nil, fmt.Errorf("LISTEN_FDS=%q invalid", lf)
	}
	if n != 1 {
		return nil, fmt.Errorf("expected exactly 1 listening fd, got %d", n)
	}
	_ = os.Unsetenv("LISTEN_PID")
	_ = os.Unsetenv("LISTEN_FDS")
	_ = os.Unsetenv("LISTEN_FDNAMES")

	file := os.NewFile(uintptr(3), "systemd-listener")
	if file == nil {
		return nil, fmt.Errorf("failed to open fd 3")
	}
	listener, err := net.FileListener(file)
	_ = file.Close()
	if err != nil {
		return nil, fmt.Errorf("net.FileListener(fd=3): %w", err)
	}
	return listener, nil
}

func splitTemplate(template string, placeholder string) (string, string, error) {
	parts := strings.Split(template, placeholder)
	if len(parts) != 2 {
		return "", "", fmt.Errorf("reader template must contain exactly one %s placeholder", placeholder)
	}
	return parts[0], parts[1], nil
}

package main

import (
	"bytes"
	"context"
	_ "embed"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	nurl "net/url"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	trafilatura "github.com/markusmobius/go-trafilatura"
	"golang.org/x/net/html"
)

const contentPlaceholder = "{{CONTENT}}"
const maxHTMLBytes = 10 << 20 // 10 MiB

//go:embed reader.html
var readerTemplate string

func main() {
	var addr = flag.String("addr", "", "TCP listen address, instead of systemd socket activation")
	flag.Parse()

	pagePrefix, pageSuffix, err := splitTemplate(readerTemplate, contentPlaceholder)
	if err != nil {
		log.Fatal(err)
	}

	var (
		server   *http.Server
		stopOnce sync.Once
	)

	mux := http.NewServeMux()
	mux.HandleFunc("/api/render", func(w http.ResponseWriter, r *http.Request) {
		defer stopOnce.Do(func() {
			go gracefulShutdown(server)
		})
		cleanHandler(w, r, pagePrefix, pageSuffix)
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

func cleanHandler(w http.ResponseWriter, r *http.Request, pagePrefix string, pageSuffix string) {
	w.Header().Set("Connection", "close")

	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if r.Body == nil {
		http.Error(w, "missing request body", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	body, err := io.ReadAll(io.LimitReader(r.Body, maxHTMLBytes+1))
	if err != nil {
		http.Error(w, "failed to read request body", http.StatusBadRequest)
		return
	}
	if len(body) == 0 {
		http.Error(w, "empty request body", http.StatusBadRequest)
		return
	}
	if len(body) > maxHTMLBytes {
		http.Error(w, "request body too large", http.StatusRequestEntityTooLarge)
		return
	}

	baseURL := r.URL.Query().Get("base_url")
	if baseURL == "" {
		baseURL = "https://example.com/"
	}

	fragment, err := extractCleanFragment(string(body), baseURL)
	if err != nil {
		http.Error(w, fmt.Sprintf("extract failed: %v", err), http.StatusBadGateway)
		return
	}

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = io.WriteString(w, pagePrefix)
	_, _ = io.WriteString(w, fragment)
	_, _ = io.WriteString(w, pageSuffix)
}

func extractCleanFragment(source string, baseURL string) (string, error) {
	var originalURL *nurl.URL
	if parsed, parseErr := nurl.ParseRequestURI(baseURL); parseErr == nil {
		originalURL = parsed
	}

	extractResult, err := trafilatura.Extract(strings.NewReader(source), trafilatura.Options{
		OriginalURL:     originalURL,
		EnableFallback:  true,
		ExcludeComments: true,
		IncludeLinks:    true,
		IncludeImages:   true,
	})
	if err != nil {
		return "", err
	}

	if extractResult == nil || extractResult.ContentNode == nil {
		return "", fmt.Errorf("trafilatura returned empty content")
	}

	absolutizeSrcAttrs(extractResult.ContentNode, originalURL)

	var out bytes.Buffer
	if err := html.Render(&out, extractResult.ContentNode); err != nil {
		return "", err
	}

	return out.String(), nil
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

func absolutizeSrcAttrs(node *html.Node, base *nurl.URL) {
	if node == nil || base == nil {
		return
	}

	if node.Type == html.ElementNode {
		for i := range node.Attr {
			if node.Attr[i].Key != "src" {
				continue
			}
			resolved := resolveURL(node.Attr[i].Val, base)
			if resolved != "" {
				node.Attr[i].Val = resolved
			}
		}
	}

	for child := node.FirstChild; child != nil; child = child.NextSibling {
		absolutizeSrcAttrs(child, base)
	}
}

func resolveURL(raw string, base *nurl.URL) string {
	if raw == "" {
		return ""
	}
	lower := strings.ToLower(raw)
	if strings.HasPrefix(lower, "data:") || strings.HasPrefix(lower, "blob:") {
		return raw
	}

	ref, err := nurl.Parse(raw)
	if err != nil {
		return raw
	}
	return base.ResolveReference(ref).String()
}

package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"sort"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"
)

const scheduleURL = "https://s3.amazonaws.com/kcm-alerts-realtime-prod/tripupdates_pb.json"

// ---- Minimal structs matching only the fields we use ----
type TripUpdates struct {
	Entity []struct {
		TripUpdate struct {
			Trip struct {
				RouteID string `json:"route_id"`
			} `json:"trip"`
			StopTimeUpdate []struct {
				StopID  string `json:"stop_id"`
				Arrival struct {
					Time int64 `json:"time"`
				} `json:"arrival"`
			} `json:"stop_time_update"`
		} `json:"trip_update"`
	} `json:"entity"`
}

// ---- Cache ----
type Cache struct {
	mu        sync.RWMutex
	expiresAt time.Time
	ttl       time.Duration
	ok        bool
	data      *TripUpdates
	details   []byte // raw response body in case of error
}

func NewCache(ttl time.Duration) *Cache { return &Cache{ttl: ttl} }

func (c *Cache) Get(client *http.Client) (bool, *TripUpdates, []byte) {
	now := time.Now()
	c.mu.Lock()
	defer c.mu.Unlock()
	fresh := c.ok == true && c.data != nil && now.Before(c.expiresAt)
	if !fresh {
		c.ok, c.data, c.details = fetchTripUpdates(client)
		c.expiresAt = time.Now().Add(c.ttl)
	}
	return c.ok, c.data, c.details
}

func fetchTripUpdates(client *http.Client) (bool, *TripUpdates, []byte) {
	req, _ := http.NewRequest("GET", scheduleURL, nil)
	req.Header.Set("User-Agent", "https://peter.demin.dev/12_articles/57-bus-time.html")
	resp, err := client.Do(req)
	if err != nil {
		return false, nil, []byte(err.Error())
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return false, nil, body
	}
	var tu TripUpdates
	if err := json.Unmarshal(body, &tu); err != nil {
		// If JSON is bad, surface the raw body
		return false, nil, body
	}
	return true, &tu, nil
}

// ---- API layer ----
type ScheduleAPI struct {
	cache  *Cache
	client *http.Client
}

func NewScheduleAPI(ttl time.Duration) *ScheduleAPI {
	return &ScheduleAPI{
		cache:  NewCache(ttl),
		client: &http.Client{Timeout: 10 * time.Second},
	}
}

type responsePayload struct {
	Arrivals map[string][]int64            `json:"arrivals"`
	Routes   map[string]map[string][]int64 `json:"routes"`
}

func (s *ScheduleAPI) stopTimesHandler(w http.ResponseWriter, r *http.Request) {
	// CORS preflight handled globally; this path handles GET.
	stopIDsParam := strings.TrimPrefix(r.URL.Path, "/bus/")
	stopIDs := splitCSV(stopIDsParam)

	ok, data, details := s.cache.Get(s.client)
	w.Header().Set("Content-Type", "application/json")

	if !ok || data == nil {
		_ = json.NewEncoder(w).Encode(map[string]any{
			"error":   "Tripupdates API returned non-200",
			"details": string(details),
		})
		return
	}

	result := responsePayload{
		Arrivals: make(map[string][]int64, len(stopIDs)),
		Routes:   make(map[string]map[string][]int64, len(stopIDs)),
	}

	for _, stopID := range stopIDs {
		result.Arrivals[stopID] = extractArrivalTimes(data, stopID)

		routes := extractRoutes(data, stopID)
		// sort each route’s times
		for _, times := range routes {
			sort.Slice(times, func(i, j int) bool { return times[i] < times[j] })
		}
		result.Routes[stopID] = routes
	}

	_ = json.NewEncoder(w).Encode(result)
}

func extractArrivalTimes(data *TripUpdates, stopID string) []int64 {
	var arrivals []int64
	for _, e := range data.Entity {
		for _, stu := range e.TripUpdate.StopTimeUpdate {
			if stu.StopID == stopID {
				arrivals = append(arrivals, stu.Arrival.Time)
			}
		}
	}
	return arrivals
}

func extractRoutes(data *TripUpdates, stopID string) map[string][]int64 {
	routes := make(map[string][]int64)
	for _, e := range data.Entity {
		var times []int64
		for _, stu := range e.TripUpdate.StopTimeUpdate {
			if stu.StopID == stopID {
				times = append(times, stu.Arrival.Time)
			}
		}
		if len(times) > 0 {
			routes[e.TripUpdate.Trip.RouteID] = append(routes[e.TripUpdate.Trip.RouteID], times...)
		}
	}
	return routes
}

func splitCSV(s string) []string {
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}

// ---- CORS middleware (origins & credentials like your FastAPI setup) ----
var allowedOrigins = map[string]struct{}{
	"https://peter.demin.dev": {},
	"http://localhost":        {},
	"http://localhost:8080":   {},
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if _, ok := allowedOrigins[origin]; ok {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func systemdListener() (net.Listener, error) {
	// Verify SystemD socket activation works:
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

	// systemd hands us the first FD at 3
	f := os.NewFile(uintptr(3), "systemd-listener")
	if f == nil {
		return nil, fmt.Errorf("failed to open fd 3")
	}
	// net.FileListener dup's the FD internally; close our *os.File handle afterwards.
	ln, err := net.FileListener(f)
	_ = f.Close()
	if err != nil {
		return nil, fmt.Errorf("net.FileListener(fd=3): %w", err)
	}
	return ln, nil
}

func main() {
	var (
		addr = flag.String("addr", "", "TCP listen address, instead of SystemD socket activation")
	)
	flag.Parse()

	api := NewScheduleAPI(60 * time.Second)

	mux := http.NewServeMux()
	mux.HandleFunc("/bus/", api.stopTimesHandler)
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	srv := &http.Server{
		Handler:           withCORS(mux),
		ReadHeaderTimeout: 5 * time.Second,
	}

	// Graceful shutdown context
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	// Serve on TCP or UNIX socket
	if *addr != "" {
		srv.Addr = *addr
		log.Printf("listening on %s (tcp)", *addr)
		go func() {
			if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
				log.Fatalf("ListenAndServe: %v", err)
			}
		}()
	} else {
		// SystemD activation socket
		ln, err := systemdListener()
		if err != nil {
			log.Fatalf("listen unix: %v", err)
		}
		log.Printf("listening on SystemD activation socket")
		go func() {
			if err := srv.Serve(ln); err != nil && err != http.ErrServerClosed {
				log.Fatalf("Serve(socket): %v", err)
			}
		}()
	}

	// Wait for signal, then graceful shutdown
	<-ctx.Done()
	stop()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("graceful shutdown error: %v", err)
	}
	log.Println("server stopped")
}

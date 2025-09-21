package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestArrivalsAndRoutes_LiveFeed(t *testing.T) {
	srv := startServer(t) // spins up the real handler (no stubs), in-process
	defer srv.Close()

	resp := httpGet(t, srv.URL+"/bus/7160,7210,6237")
	defer resp.Body.Close()

	assertStatusOK(t, resp.StatusCode)

	body := decodeJSONMap(t, resp)
	assertHasKeys(t, body, "arrivals", "routes")
}

// ---------- Helpers ----------

func startServer(t *testing.T) *httptest.Server {
	t.Helper()
	api := NewScheduleAPI(60 * time.Second)

	mux := http.NewServeMux()
	mux.HandleFunc("/bus/", api.stopTimesHandler)
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	// withCORS is from main.go; keeps behavior identical to prod
	return httptest.NewServer(withCORS(mux))
}

func httpGet(t *testing.T, url string) *http.Response {
	t.Helper()
	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		t.Fatalf("GET %s failed: %v", url, err)
	}
	return resp
}

func assertStatusOK(t *testing.T, status int) {
	t.Helper()
	if status != http.StatusOK {
		t.Fatalf("unexpected status: got %d, want %d", status, http.StatusOK)
	}
}

func decodeJSONMap(t *testing.T, resp *http.Response) map[string]json.RawMessage {
	t.Helper()
	var body map[string]json.RawMessage
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	return body
}

func assertHasKeys(t *testing.T, m map[string]json.RawMessage, keys ...string) {
	t.Helper()
	for _, k := range keys {
		if _, ok := m[k]; !ok {
			t.Fatalf("response missing top-level key %q", k)
		}
	}
}

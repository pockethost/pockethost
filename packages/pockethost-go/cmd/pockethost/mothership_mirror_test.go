package main

import (
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

// Requests that overlap a build share it; the next request after it builds again.
func TestMirrorFlightShares(t *testing.T) {
	var f mirrorFlight
	var builds atomic.Int32
	release := make(chan struct{})
	build := func() ([]byte, error) {
		builds.Add(1)
		<-release
		return []byte(`{}`), nil
	}
	var wg sync.WaitGroup
	for range 6 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if b, err := f.do(build); err != nil || string(b) != `{}` {
				t.Errorf("got %q, %v", b, err)
			}
		}()
	}
	time.Sleep(50 * time.Millisecond) // let all six join the one build
	close(release)
	wg.Wait()
	if n := builds.Load(); n != 1 {
		t.Fatalf("six overlapping requests built %d dumps, want 1", n)
	}
	if _, err := f.do(build); err != nil || builds.Load() != 2 {
		t.Fatalf("a later request should build again: builds=%d err=%v", builds.Load(), err)
	}
}

// A panicking build doesn't leave the requests waiting on it stuck.
func TestMirrorFlightPanic(t *testing.T) {
	var f mirrorFlight
	started := make(chan struct{})
	go func() {
		defer func() { recover() }()
		f.do(func() ([]byte, error) { close(started); time.Sleep(50 * time.Millisecond); panic("boom") })
	}()
	<-started
	done := make(chan error)
	go func() { _, err := f.do(func() ([]byte, error) { return nil, nil }); done <- err }()
	select {
	case err := <-done:
		if !errors.Is(err, errMirrorAborted) {
			t.Fatalf("waiter got %v, want errMirrorAborted", err)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("waiter stuck after the build panicked")
	}
}

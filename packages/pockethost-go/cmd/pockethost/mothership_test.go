package main

import (
	"testing"
	"time"

	"pocketone.dev/ext/jsvm"
)

func TestFirstCommand(t *testing.T) {
	for _, c := range []struct {
		args []string
		want string
	}{
		{[]string{"migrate", "up", "--dir=x"}, "migrate"},
		{[]string{"--dir", "x", "migrate", "up"}, "migrate"},
		{[]string{"--dir=x", "serve", "--http", "0.0.0.0:8090"}, "serve"},
		{[]string{"--dev", "serve"}, "serve"},
		{[]string{"--config", "/etc/pocketone.yaml", "serve"}, "serve"},
		{nil, ""},
	} {
		if got := firstCommand(c.args); got != c.want {
			t.Errorf("%v: got %q, want %q", c.args, got, c.want)
		}
	}
}

func TestMothershipJSLimits(t *testing.T) {
	got := mothershipJSLimits(jsvm.VMConfig{})
	if got.MemoryLimit != 1<<30 || got.TaskBudget != 5*time.Minute || got.TaskWall != 30*time.Minute ||
		got.WaitTimeout != 5*time.Minute {
		t.Fatalf("defaults: got %+v", got)
	}
	got = mothershipJSLimits(jsvm.VMConfig{MemoryLimit: 2 << 30, TaskBudget: time.Minute})
	if got.MemoryLimit != 2<<30 || got.TaskBudget != time.Minute || got.TaskWall != 30*time.Minute {
		t.Fatalf("yaml wins per key: got %+v", got)
	}
}

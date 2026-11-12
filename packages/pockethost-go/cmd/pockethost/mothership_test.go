package main

import "testing"

func TestFirstCommand(t *testing.T) {
	for _, c := range []struct {
		args []string
		want string
	}{
		{[]string{"migrate", "up", "--dir=x"}, "migrate"},
		{[]string{"--dir", "x", "migrate", "up"}, "migrate"},
		{[]string{"--dir=x", "serve", "--http", "0.0.0.0:8090"}, "serve"},
		{[]string{"--dev", "serve"}, "serve"},
		{nil, ""},
	} {
		if got := firstCommand(c.args); got != c.want {
			t.Errorf("%v: got %q, want %q", c.args, got, c.want)
		}
	}
}

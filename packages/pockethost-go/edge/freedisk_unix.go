//go:build !windows

package edge

import "syscall"

// freeDisk returns the bytes available to this process on dir's filesystem; false when it can't tell.
func freeDisk(dir string) (int64, bool) {
	var st syscall.Statfs_t
	if syscall.Statfs(dir, &st) != nil {
		return 0, false
	}
	return int64(st.Bavail) * int64(st.Bsize), true
}

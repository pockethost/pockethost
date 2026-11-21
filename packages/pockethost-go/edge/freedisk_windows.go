//go:build windows

package edge

import "golang.org/x/sys/windows"

// freeDisk returns the bytes available to this process on dir's volume; false when it can't tell.
func freeDisk(dir string) (int64, bool) {
	p, err := windows.UTF16PtrFromString(dir)
	if err != nil {
		return 0, false
	}
	var avail uint64
	if windows.GetDiskFreeSpaceEx(p, &avail, nil, nil) != nil {
		return 0, false
	}
	return int64(avail), true
}

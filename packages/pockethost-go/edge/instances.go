package edge

import (
	"context"
	"net/http"
)

// Instances is what PocketHost's edge features (deploy API, webhook scheduler, vacuum) need from the runtime
// provider: pocker's Manager in-process, or DockerInstances for containers.
type Instances interface {
	Ready() bool
	ServeHTTP(w http.ResponseWriter, r *http.Request)
	LogInstance(id, stream, message string)
	Running(id string) bool
	InstanceDir(id string) (string, bool)
	WithInstanceStopped(ctx context.Context, id string, fn func(dir string) error) error
	StartInstance(ctx context.Context, id string) error
}

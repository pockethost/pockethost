package pocketbase

import (
	"github.com/benallfree/pbscript/modules/pbscript/engine"
	"github.com/pocketbase/pocketbase"
)

func New() *pocketbase.PocketBase {
    app := pocketbase.New()
    engine.StartPBScript(app)
    return app
}
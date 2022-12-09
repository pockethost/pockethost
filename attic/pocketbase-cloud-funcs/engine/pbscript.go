package engine

import (
	"fmt"
	"net/http"
	"unsafe"

	"github.com/benallfree/pbscript/modules/pbscript/event"

	"github.com/goccy/go-json"

	"github.com/dop251/goja"
	"github.com/labstack/echo/v5"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/daos"
	"github.com/pocketbase/pocketbase/models"
	"github.com/pocketbase/pocketbase/models/schema"
)

var app *pocketbase.PocketBase
var router *echo.Echo
var vm *goja.Runtime
var cleanups = []func(){}
var __go_apis *goja.Object

const (
	colorReset  = "\033[0m"
	colorRed    = "\033[31m"
	colorGreen  = "\033[32m"
	colorYellow = "\033[33m"
	colorBlue   = "\033[34m"
	colorPurple = "\033[35m"
	colorCyan   = "\033[36m"
	colorWhite  = "\033[37m"
)

func logErrorf(format string, args ...any) (n int, err error) {

	s := append(args, string(colorReset))
	fmt.Print(colorRed)
	res, err := fmt.Printf(format, s...)
	fmt.Print(colorReset)
	return res, err
}

func bindApis() {
	__go_apis = vm.NewObject()
	__go_apis.Set("addRoute", func(route echo.Route) {
		method := route.Method
		path := route.Path
		fmt.Printf("Adding route: %s %s\n", method, path)

		router.AddRoute(route)
		cleanup(
			fmt.Sprintf("route %s %s", method, path),
			func() {
				router.Router().Remove(method, path)
			})
	})
	__go_apis.Set("onModelBeforeCreate", func(cb func(e *core.ModelEvent)) {
		fmt.Println("Listening in Go for onModelBeforeCreate")
		unsub := event.On(event.EVT_ON_MODEL_BEFORE_CREATE, func(e *event.UnknownPayload) {
			// fmt.Println("syntheticevent: OnModelBeforeCreate")
			// fmt.Println("e", e)
			// fmt.Println("cb", cb)
			cb((*core.ModelEvent)(unsafe.Pointer(e)))
		})
		cleanup("onModelBeforeCreate", unsub)
	})
	__go_apis.Set("onModelAfterCreate", func(cb func(e *core.ModelEvent)) {
		fmt.Println("Listening in Go for onModelAfterCreate")
		unsub := event.On(event.EVT_ON_MODEL_AFTER_CREATE, func(e *event.UnknownPayload) {
			// fmt.Println("syntheticevent: OnModelAfterCreate")
			// fmt.Println("e", e)
			// fmt.Println("cb", cb)
			cb((*core.ModelEvent)(unsafe.Pointer(e)))
		})
		cleanup("onModelAfterCreate", unsub)
	})

	// type TransactionApi struct {
	// 	Execute func(sql string)
	// }
	// __go_apis.Set("withTransaction", func(cb func(e *TransactionApi)) {
	// 	app.Dao().RunInTransaction(func(txDao *daos.Dao) error {
	// 		var api = TransactionApi{
	// 			Execute: func(sql string) error {
	// 				res, err := txDao.DB().Select().NewQuery(sql).Execute()
	// 				if err != nil {
	// 					return err
	// 				}

	// 			}}
	// 	})

	// })

	__go_apis.Set("requireAdminAuth", apis.RequireAdminAuth)
	__go_apis.Set("requireAdminAuthOnlyIfAny", apis.RequireAdminAuthOnlyIfAny)
	__go_apis.Set("requireAdminOrOwnerAuth", apis.RequireAdminOrOwnerAuth)
	__go_apis.Set("requireAdminOrUserAuth", apis.RequireAdminOrUserAuth)
	__go_apis.Set("app", app)
	__go_apis.Set("ping", func() string {
		return "Hello from Go!"
	})
	__go_apis.Set("newNullStringMapArrayPtr", func() *[]dbx.NullStringMap {
		var users2 []dbx.NullStringMap
		return &users2
	})
	__go_apis.Set("newNullStringMap", func() dbx.NullStringMap {
		var users2 dbx.NullStringMap
		return users2
	})
}

func cleanup(msg string, cb func()) {
	fmt.Printf("adding cleanup: %s\n", msg)
	cleanups = append(cleanups, func() {
		fmt.Printf("executing cleanup: %s\n", msg)
		cb()
	})
}

func loadActiveScript() (string, error) {

	collection, err := app.Dao().FindCollectionByNameOrId("pbscript")
	if err != nil {
		return "", err
	}
	recs, err := app.Dao().FindRecordsByExpr(collection, dbx.HashExp{"type": "script", "isActive": true})
	if err != nil {
		return "", err
	}
	if len(recs) > 1 {
		return "", fmt.Errorf("expected one active script record but got %d", len(recs))
	}
	if len(recs) == 0 {
		return "", nil // Empty script
	}
	rec := recs[0]
	jsonData := rec.GetStringDataValue("data")
	type Data struct {
		Source string `json:"source"`
	}
	var json_map Data
	err = json.Unmarshal([]byte(jsonData), &json_map)
	if err != nil {
		return "", err
	}

	script := json_map.Source
	fmt.Printf("Script has been loaded.\n")
	return script, nil

}

func reloadVm() error {
	fmt.Println("Initializing PBScript engine")
	vm = goja.New()
	vm.SetFieldNameMapper(goja.UncapFieldNameMapper())

	// Clean up all handlers
	fmt.Println("Executing cleanups")
	for i := 0; i < len(cleanups); i++ {
		cleanups[i]()
	}
	cleanups = nil

	// Load the main script
	fmt.Println("Loading JS")
	script, err := loadActiveScript()
	if err != nil {
		return err
	}

	// Console proxy
	fmt.Println("Creating console proxy")
	console := vm.NewObject()
	console.Set("log", func(s ...goja.Value) {
		for _, v := range s {
			fmt.Printf("%s ", v.String())
		}
		fmt.Print("\n")
	})
	vm.Set("console", console)

	fmt.Println("Creating apis proxy")
	bindApis()
	vm.Set("__go", __go_apis)

	fmt.Println("Go initialization complete. Running script.")
	source := fmt.Sprintf(`
console.log('Top of PBScript bootstrap')
let __jsfuncs = {ping: ()=>'Hello from PBScript!'}
function registerJsFuncs(funcs) {
__jsfuncs = {__jsfuncs, ...funcs }
}
%s
console.log('Pinging Go')
console.log('Pinging Go succeeded with:', __go.ping())
console.log('Bottom of PBScript bootstrap')
`, script)
	_, err = vm.RunString(source)
	if err != nil {
		return err
	}

	// js api  wireup
	fmt.Println("Wiring up JS API")
	type S struct {
		Ping func() (string, *goja.Exception) `json:"ping"`
	}
	jsFuncs := S{}
	err = vm.ExportTo(vm.Get("__jsfuncs"), &jsFuncs)
	if err != nil {
		return err
	}

	{
		fmt.Println("Pinging JS")
		res, err := jsFuncs.Ping()
		if err != nil {
			return fmt.Errorf("ping() failed with %s", err.Value().Export())
		} else {
			fmt.Printf("Ping succeeded with: %s\n", res)
		}
	}
	return nil
}

func migrate() error {
	fmt.Println("Finding collection")
	_, err := app.Dao().FindCollectionByNameOrId("anything")
	fmt.Println("Finished collection")
	if err != nil {
		err = app.Dao().SaveCollection(&models.Collection{
			Name: "pbscript",
			Schema: schema.NewSchema(
				&schema.SchemaField{
					Type: schema.FieldTypeText,
					Name: "type",
				},
				&schema.SchemaField{
					Type: schema.FieldTypeBool,
					Name: "isActive",
				},
				&schema.SchemaField{
					Type: schema.FieldTypeJson,
					Name: "data",
				},
			),
		})
		if err != nil {
			return err
		}
	}

	return nil
}

func watchForScriptChanges() {
	app.OnModelAfterUpdate().Add(func(e *core.ModelEvent) error {
		if e.Model.TableName() == "pbscript" {
			reloadVm()
		}
		return nil
	})

	app.OnModelAfterCreate().Add(func(e *core.ModelEvent) error {
		if e.Model.TableName() == "pbscript" {
			reloadVm()
		}
		return nil
	})

	app.OnBeforeServe().Add(func(e *core.ServeEvent) error {
		// add new "GET /api/hello" route

		e.Router.AddRoute(echo.Route{
			Method: http.MethodPost,
			Path:   "/api/pbscript/deploy",
			Handler: func(c echo.Context) error {
				json_map := make(map[string]interface{})
				err := json.NewDecoder(c.Request().Body).Decode(&json_map)
				if err != nil {
					return err
				}
				//json_map has the JSON Payload decoded into a map
				src := json_map["source"]

				err = app.Dao().RunInTransaction(func(txDao *daos.Dao) error {
					fmt.Println("Deactivating active script")
					_, err := txDao.DB().
						NewQuery("UPDATE pbscript SET isActive=false WHERE type='script'").Execute()
					if err != nil {
						return err
					}

					fmt.Println("Packaging new record data")
					bytes, err := json.Marshal(dbx.Params{"source": src})
					if err != nil {
						return err
					}
					_json := string(bytes)

					fmt.Println("Saving new model")
					collection, err := txDao.FindCollectionByNameOrId("pbscript")
					if err != nil {
						return err
					}
					record := models.NewRecord(collection)
					record.SetDataValue("type", "script")
					record.SetDataValue("isActive", "true")
					record.SetDataValue("data", _json)
					err = txDao.SaveRecord(record)
					if err != nil {
						return err
					}
					fmt.Println(("Record saved"))
					// _, err = txDao.DB().
					// 	NewQuery("INSERT INTO pbscript (type,isActive,data) values ('script', true, {data})").Bind(dbx.Params{"data": _json}).Execute()
					// if err != nil {
					// 	return err
					// }
					return nil
				})
				if err != nil {
					return err
				}
				return c.String(http.StatusOK, "ok")

			},
			Middlewares: []echo.MiddlewareFunc{
				apis.RequireAdminAuth(),
			},
		})

		return nil
	})
}

func initAppEvents() {
	app.OnModelBeforeCreate().Add(func(e *core.ModelEvent) error {
		fmt.Println("event: OnModelBeforeCreate")
		event.Fire(event.EVT_ON_MODEL_BEFORE_CREATE, (*event.UnknownPayload)(unsafe.Pointer(e)))
		return nil
	})
	app.OnModelAfterCreate().Add(func(e *core.ModelEvent) error {
		fmt.Println("event: OnModelAfterCreate")
		event.Fire(event.EVT_ON_MODEL_AFTER_CREATE, (*event.UnknownPayload)(unsafe.Pointer(e)))
		return nil
	})
}

func StartPBScript(_app *pocketbase.PocketBase) error {
	app = _app

	watchForScriptChanges()

	app.OnBeforeServe().Add(func(e *core.ServeEvent) error {
		migrate()
		initAppEvents()
		router = e.Router
		err := reloadVm()
		if err != nil {
			logErrorf("Error loading VM: %s\n", err)
		}
		return nil
	})

	return nil

}

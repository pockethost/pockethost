package event

import "fmt"

type UnknownPayload any

var inc = 0
var events = map[string]map[int]func(payload *UnknownPayload){}

const (
	EVT_ON_MODEL_BEFORE_CREATE = "OnModelBeforeCreate"
	EVT_ON_MODEL_AFTER_CREATE  = "OnModelAfterCreate"
)

func isValid(eventName string) bool {
	return eventName == EVT_ON_MODEL_BEFORE_CREATE || eventName== EVT_ON_MODEL_AFTER_CREATE
}

func ensureEvent(eventName string) {
	if !isValid((eventName)) {
		panic(fmt.Sprintf("%s is not a valid event name", eventName))
	}
	if _, ok := events[eventName]; !ok {
		fmt.Printf("Creating collection for %s\n", eventName)
		events[eventName] = make(map[int]func(payload *UnknownPayload))
	}
}

func On(eventName string, cb func(payload *UnknownPayload)) func() {
	ensureEvent(eventName)

	inc++
	idx := inc
	events[eventName][idx] = cb
	fmt.Printf("Adding %d to %s\n", idx, eventName)
	return func() {
		delete(events[eventName], idx)
	}
}

func Fire(eventName string, payload *UnknownPayload) {
	ensureEvent(eventName)

	fmt.Printf("Firing %s\n", eventName)
	for fnId, v := range events[eventName] {
		fmt.Printf("Dispatching %s to %d\n", eventName, fnId)
		v(payload)
	}
}

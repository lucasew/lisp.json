package lispjson

import (
	"encoding/json"
	"io/ioutil"
	"testing"
    "github.com/davecgh/go-spew/spew"
)

type Cases struct {
    Request []interface{} `json:"request"`
}

func TestCases(t *testing.T) {
    env := NewDefaultEnvironment()
    var cases Cases
    file, err := ioutil.ReadFile("../tests.json")
    if err != nil {
        t.Errorf(err.Error())
    }
    json.Unmarshal(file, &cases)
    // spew.Dump(cases)
    for _, thisCase := range cases.Request {
        _, err := env.Eval(thisCase)
        if err != nil {
            t.Errorf("%s: %s", err.Error(), spew.Sdump(thisCase))
        }
    }
}

func TestGetSet(t *testing.T) {
    env := NewDefaultEnvironment()
    env.Set("a", 2)
    if env.Get("a") != 2 {
        spew.Dump(env)
        t.Errorf("fail get")
    }
    if env.Push().Get("a") != 2 {
        spew.Dump(env)
        t.Errorf("fail get with push")
    }
}

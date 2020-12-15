package lispjson

import (
	"fmt"
)

type Environment interface {
    Get(key string) interface{}
    Set(key string, v interface{}) (replaced bool)
    Push() Environment
    Eval(ast interface{}) (interface{}, error)
}

type defaultEnvironment struct {
    basedOn Environment
    env map[string]interface{}
}

func NewDefaultEnvironment() Environment {
    return &defaultEnvironment{
        basedOn: LibEnvironment(stdlib),
        env: map[string]interface{}{},
    }
}

func NewDefaultEnvironmentFrom(e Environment) Environment {
    return &defaultEnvironment{
        basedOn: NewDefaultEnvironment(),
        env: map[string]interface{}{},
    }
}

func (d *defaultEnvironment) Get(key string) (v interface{}) {
    v, ok := d.env[key]
    if !ok {
        if d.basedOn != nil {
            return d.basedOn.Get(key)
        }
    } else {
        return v
    }
    return nil
}

func (d *defaultEnvironment) Set(key string, v interface{}) (replaced bool) {
    _, replaced = d.env[key]
    d.env[key] = v
    return
}

func (d *defaultEnvironment) Push() Environment {
    return &defaultEnvironment{
        basedOn: d,
        env: map[string]interface{}{},
    }
}

func (d *defaultEnvironment) Eval(ast interface{}) (interface{}, error) {
    eval, ok := d.Get("eval").(LispFunction)
    if !ok {
        return nil, fmt.Errorf("eval not defined in environment")
    }
    return eval(d, ast)
}

package lispjson

import (
	"encoding/json"
	"fmt"
	"reflect"
	"strings"

	// "github.com/davecgh/go-spew/spew"
)

type LispFunction func (e Environment, params ...interface{}) (interface{}, error)
type Lib map[string]LispFunction

func V(v ...interface{}) []interface{} {
    return v
}

type LibEnvironment map[string]LispFunction

func (l LibEnvironment) Get(key string) interface{} {
    v, ok := l[key]
    if !ok {
        return nil
    }
    return v
}

func (l LibEnvironment) Set(key string, value interface{}) bool {
    return false
}

func (l LibEnvironment) Push() Environment {
    return NewDefaultEnvironmentFrom(l)
}

func (l LibEnvironment) Eval(ast interface{}) (interface{}, error) {
    fn := stdlib["eval"]
    return fn(l, ast)
}


var stdlib = map[string]LispFunction {
    "eval": func(e Environment, params ...interface{}) (ret interface{}, err error) {
        input := params[0]
        switch v := input.(type) {
            case nil:
                return nil, nil
            case string:
                return v, nil
            case bool:
                return v, nil
            case int, int16, int32, int64, int8, float32, float64:
                return reflect.ValueOf(v).Float(), nil
            case LispFunction:
                return input, nil
            case []interface{}:
                v[0], err = e.Eval(v[0])
                if err != nil {
                    return nil, err
                }
                begin:
                switch first := v[0].(type) {
                case string:
                    v[0] = e.Get(first)
                    if v[0] == nil {
                        return nil, fmt.Errorf("function %s not found", first)
                    }
                    goto begin
                case LispFunction:
                    return first(e, v[1:]...)
                case func(Environment, ...interface {}) (interface {}, error):
                    return first(e, v[1:]...)
                default:
                    return nil, fmt.Errorf("cant call non function value %T", first)
                }
        }
        return nil, fmt.Errorf("cant handle type %T", input)
    },
    "evalAll": func (e Environment, params ...interface{}) (interface{}, error) {
        ret := make([]interface{}, len(params))
        var err error
        for i := 0; i < len(params); i++ {
            ret[i], err = e.Eval(params[i])
            if err != nil {
                return nil, err
            }
        }
        return ret, nil
    },
    "assert": func(e Environment, params ...interface{}) (interface{}, error) {
        v, err := e.Eval(params[0])
        if err != nil {
            return nil, err
        }
        check, ok := v.(bool)
        if !ok {
            return nil, fmt.Errorf("first parameter must be boolean")
        }
        var msg string = "assert failed"
        if len(params) == 2 {
            v, err = e.Eval(params[1])
            if err != nil {
                return nil, err
            }
            msg, ok = v.(string)
            if !ok {
                return nil, fmt.Errorf("second parameter (optional) must be string")
            }
        }
        if !check {
            return nil, fmt.Errorf(msg)
        } else {
            return nil, nil
        }
    },
    "eq": func(e Environment, params ...interface{}) (interface{}, error) {
        if !IsSize(2, params...) {
            return nil, fmt.Errorf("expected 2 parameters, got %d", len(params))
        }
        va, err := e.Eval(params[0])
        if err != nil {
            return nil, err
        }
        vb, err := e.Eval(params[1])
        if err != nil {
            return nil, err
        }
        return reflect.DeepEqual(va, vb), nil
    },
    "serialize": func(e Environment, params ...interface{}) (interface{}, error) {
        v, err := e.Eval(params[0])
        if err != nil {
            return nil, err
        }
        return json.Marshal(v)
    },
    "assertEq": func(e Environment, params ...interface{}) (interface{}, error) {
        if !IsSize(2, params...) {
            return nil, fmt.Errorf("expected 2 values got %d", len(params))
        }
        eq, ok := e.Get("eq").(LispFunction)
        if !ok {
            return nil, fmt.Errorf("eq is not a function")
        }
        assert, ok := e.Get("assert").(LispFunction)
        if !ok {
            return nil, fmt.Errorf("assert is not a function")
        }
        ev, err := eq(e, params[0], params[1])
        if err != nil {
            return nil, err
        }
        ma, _ := json.Marshal(params[0])
        mb, _ := json.Marshal(params[1])
        return assert(e, ev.(bool), fmt.Sprintf("assert failed: %s != %s", ma, mb))
    },
    "quote": func(e Environment, params ...interface{}) (interface{}, error) {
        return params[0], nil
    },
    "not": func(e Environment, params ...interface{}) (interface{}, error) {
        v, err := e.Eval(params[0])
        if err != nil {
            return nil, err
        }
        b, ok := v.(bool)
        if !ok {
            return nil, fmt.Errorf("not parameter must be boolean")
        }
        return !b, nil
    },
    "isString": func(e Environment, params ...interface{}) (interface{}, error) {
        v, err := e.Eval(params[0])
        if err != nil {
            return nil, err
        }
        _, ok := v.(string)
        return ok, nil
    },
    "let": func(e Environment, params ...interface{}) (interface{}, error) {
        if len(params) % 2 != 1 {
            return nil, fmt.Errorf("%s", "missing the body of let (len(params) % 2 != 1)")
        }
        newEnv := e.Push()
        nvars := (len(params) - 1) / 2
        eval := newEnv.Get("eval").(LispFunction)
        for i := 0; i < nvars; i++ {
            v, err := eval(newEnv, params[2*i])
            if err != nil {
                return nil, err
            }
            key, ok := v.(string)
            if !ok {
                return nil, fmt.Errorf("specified let key is %T that is not a string", v)
            }
            v, err = eval(newEnv, params[(2*i) + 1])
            if err != nil {
                return nil, err
            }
            newEnv.Set(key, v)
        }
        // spew.Dump(newEnv)
        return eval(newEnv, params[len(params) - 1])
    },
    "get": func(e Environment, params ...interface{}) (interface{}, error) {
        v, err := e.Eval(params[0])
        if err != nil {
            return nil, err
        }
        key, ok := v.(string)
        if !ok {
            return nil, fmt.Errorf("get: key needs to be string")
        }
        return e.Get(key), nil
    },
    "sym": func(e Environment, params ...interface{}) (interface{}, error) {
        v, err := e.Eval(params[0])
        if err != nil {
            return nil, err
        }
        name, ok := v.(string)
        if !ok {
            return nil, fmt.Errorf("symbol name must be a string but its %T", v)
        }
        return func(e Environment, params ...interface{}) (interface{}, error) {
            return e.Get(name), nil
        }, nil
    },
    "isFunction": func(e Environment, params ...interface{}) (interface{}, error) {
        v, err := e.Eval(params[0])
        if err != nil {
            return nil, err
        }
        switch v.(type) {
        case LispFunction, func(Environment, ...interface {}) (interface {}, error):
            return true, nil
        }
        return false, nil
    },
    "car": func(e Environment, params ...interface{}) (interface{}, error) {
        v, err := e.Eval(params[0])
        if err != nil {
            return nil, err
        }
        vec, ok := v.([]interface{})
        if !ok {
            return nil, fmt.Errorf("input for car must be a list but is a %T", v)
        }
        if len(vec) > 0 {
            return vec[0], nil
        }
        return nil, nil
    },
    "cdr": func(e Environment, params ...interface{}) (interface{}, error) {
        v, err := e.Eval(params[0])
        if err != nil {
            return nil, err
        }
        vec, ok := v.([]interface{})
        if !ok {
            return nil, fmt.Errorf("input for car must be a list but is a %T", v)
        }
        if len(vec) > 0 {
            return vec[1:], nil
        }
        return nil, nil
    },
    "if": func(e Environment, params ...interface{}) (interface{}, error) {
        if len(params) != 3 {
            return nil, fmt.Errorf("if cond if_true if_false")
        }
        v, err := e.Eval(params[0])
        if err != nil {
            return nil, err
        }
        cond, ok := v.(bool)
        if !ok {
            return nil, fmt.Errorf("cond for if must be bool but its %T", v)
        }
        if cond {
            return e.Eval(params[1])
        } else {
            return e.Eval(params[2])
        }
    },
    "intoString": func(e Environment, params ...interface{}) (interface{}, error) {
        v, err := e.Eval(params[0])
        if err != nil {
            return nil, err
        }
        switch ret := v.(type) {
            case float64:
                frepr := fmt.Sprintf("%f", ret)
                return strings.TrimRight(frepr, "0."), nil
            case string:
                return ret, nil
            case LispFunction, func(Environment, ...interface {}) (interface {}, error):
                return "[ FUNCTION ]", nil
            case bool:
                return fmt.Sprintf("%v", ret), nil
            case nil:
                return "null", nil
            default:
                return "[NOT IMPLEMENTED]", fmt.Errorf("intoString: type not implemented: %T", v)
        }
    },
    "concat": func(e Environment, params ...interface{}) (interface{}, error) {
        var ok bool
        values := make([]string, len(params))
        for i, param := range params {
            eParam, err := e.Eval(param)
            if err != nil {
                return nil, err
            }
            values[i], ok = eParam.(string)
            if !ok {
                return nil, fmt.Errorf("concat: value at index %d is of type %T instead of string", i, eParam)
            }
        }
        return strings.Join(values, ""), nil
    },
    "+": func(e Environment, params ...interface{}) (interface{}, error) {
        var ok bool
        if len(params) == 0 {
            return 0, nil
        }
        values := make([]float64, len(params))
        for i, param := range params {
            eParam, err := e.Eval(param)
            if err != nil {
                return nil, err
            }
            values[i], ok = eParam.(float64)
            if !ok {
                return nil, fmt.Errorf("+: expected number, got %T at index %d", eParam, i)
            }
        }
        acc := values[0]
        for _, value := range values[1:] {
            acc += value
        }
        return acc, nil
    },
    "-": func(e Environment, params ...interface{}) (interface{}, error) {
        var ok bool
        if len(params) == 0 {
            return 0, nil
        }
        values := make([]float64, len(params))
        for i, param := range params {
            eParam, err := e.Eval(param)
            if err != nil {
                return nil, err
            }
            values[i], ok = eParam.(float64)
            if !ok {
                return nil, fmt.Errorf("+: expected number, got %T at index %d", eParam, i)
            }
        }
        acc := values[0]
        for _, value := range values[1:] {
            acc -= value
        }
        return acc, nil
    },
    "*": func(e Environment, params ...interface{}) (interface{}, error) {
        var ok bool
        if len(params) == 0 {
            return 0, nil
        }
        values := make([]float64, len(params))
        for i, param := range params {
            eParam, err := e.Eval(param)
            if err != nil {
                return nil, err
            }
            values[i], ok = eParam.(float64)
            if !ok {
                return nil, fmt.Errorf("+: expected number, got %T at index %d", eParam, i)
            }
        }
        acc := values[0]
        for _, value := range values[1:] {
            acc *= value
        }
        return acc, nil
    },
    "/": func(e Environment, params ...interface{}) (interface{}, error) {
        var ok bool
        if len(params) == 0 {
            return 0, nil
        }
        values := make([]float64, len(params))
        for i, param := range params {
            eParam, err := e.Eval(param)
            if err != nil {
                return nil, err
            }
            values[i], ok = eParam.(float64)
            if !ok {
                return nil, fmt.Errorf("+: expected number, got %T at index %d", eParam, i)
            }
        }
        acc := values[0]
        for _, value := range values[1:] {
            acc /= value
        }
        return acc, nil
    },
    "try": func(e Environment, params ...interface{}) (interface{}, error) {
        v, err := e.Eval(params[0])
        if err != nil {
            return V("error", err.Error()), nil
        }
        return v, nil
    },
    "throw": func(e Environment, params ...interface{}) (interface{}, error) {
        v, err := e.Eval(params[0])
        if err != nil {
            return nil, err
        }
        msg, ok := v.(string)
        if !ok {
            return nil, fmt.Errorf("throw message must be string but is %T", v)
        }
        return nil, fmt.Errorf("%s", msg)
    },
    "callFn": func(e Environment, params ...interface{}) (interface{}, error) {
        evParams, err := e.Eval(params[1])
        if err != nil {
            return nil, err
        }
        vec, ok := evParams.([]interface{})
        if !ok {
            return nil, fmt.Errorf("function params must be a list of values but is a %T", params[1])
        }
        ast := V(params[0])
        ast = append(ast, vec...)
        return e.Eval(ast)
    },
    "fn": func(e Environment, params ...interface{}) (interface{}, error) {
        paramNames, ok := params[0].([]interface{})
        if !ok {
            return nil, fmt.Errorf("fn: params must be a list of strings")
        }

        kws := make([]string, len(paramNames))
        for i, param := range paramNames {
            kws[i], ok = param.(string)
            if !ok {
                return nil, fmt.Errorf("fn: params must be a list of strings")
            }
        }
        variadic := kws[len(kws) - 1] == "&rest"
        if variadic {
            kws = kws[0:len(kws) - 1]
        }
        return func(e Environment, innerParams ...interface{}) (ret interface{}, err error) {
            e = e.Push()
            if !variadic {
                if len(innerParams) != len(kws) {
                    return nil, fmt.Errorf("expected %d parameters got %d", len(kws), len(innerParams))
                }
            } else {
                evalAll, ok := e.Get("evalAll").(LispFunction)
                if !ok {
                    return nil, fmt.Errorf("evalAll is not a function or is inexistent")
                }
                extraParams, err := evalAll(e, innerParams)
                if err != nil {
                    return nil, err
                }
                e.Set("rest", extraParams)
            }
            for i := 0; i < len(kws); i++ {
                v, err := e.Eval(innerParams[i])
                if err != nil {
                    return nil, err
                }
                e.Set(kws[i], v)
            }

            for _, stmt := range params[1:] {
                ret, err = e.Eval(stmt)
                if err != nil {
                    return
                }
            }
            return
        }, nil
    },
}

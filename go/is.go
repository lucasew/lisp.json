package lispjson

func IsFunction(v interface{}) bool {
    _, ok := v.(LispFunction)
    return ok
}

func IsString(v interface{}) bool {
    _, ok := v.(string)
    return ok
}

func IsSize(n int, v ...interface{}) bool {
    return n == len(v)
}

package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/lucasew/lisp.json/go"
)

func main() {
    buf := ""
    env := lispjson.NewDefaultEnvironment()
    line := ""
    scanner := bufio.NewScanner(os.Stdin)
    for {
        var obj interface{}
        line = ""
        if buf == "" {
            fmt.Printf(">  ")
        } else {
            fmt.Printf(">> ")
        }
        if !scanner.Scan() {
            return
        }
        if scanner.Err() != nil {
            return
        }
        line = scanner.Text()
        if line == "" {
            buf = ""
        }
        buf = strings.Join([]string{buf, line}, "\n")
        if len(buf) > 0 && buf[len(buf) - 1] == '\n' {
            buf = buf[0:len(buf) - 1]
        }
        buf = strings.ReplaceAll(buf, "'", "\"")
        // fmt.Printf("%s: %+v\n", buf, []byte(buf))
        err := json.Unmarshal([]byte(buf), &obj)
        if err != nil {
            fmt.Println(buf)
            fmt.Printf("parse err: %s\n", err.Error())
            continue
        }
        buf = ""
        ret, err := env.Eval(obj)
        if err != nil {
            buf = ""
            fmt.Printf("eval err: %s\n", err.Error())
            continue
        }
        out, err := json.Marshal(ret)
        if err != nil {
            fmt.Printf("serialize result err: %s\n", err.Error())
        }
        fmt.Printf("%s\n", out)
    }
}

import { assert } from "console"
import { stringify } from "querystring"

export type LispValue = LispFunction | number | string | LispValue[] | boolean | null
export type LispFunction = (this: LispEnvironment, ...v: LispValue[]) => LispValue
export type LispExpression = [LispFunction | string, ...LispValue[]]

export type LispRequest = {
    actions: LispExpression[]
}

export type LispEnvironment = Record<string, LispValue>

export default class LispEvaluator {
    public env: LispEnvironment = baseLispEnvironment

    constructor(options?: {
        extraEnv?: LispEnvironment
    }) {
        this.env = pushThis(this.env, options?.extraEnv)
    }

    public responder(this: LispEvaluator, req: LispRequest): LispValue[] {
        return (this.env.evalAll as LispFunction).bind(this.env)(req.actions) as LispValue[]
    }
    public eval(this: LispEvaluator, v: LispValue): LispValue {
        return (this.env.eval as LispFunction).bind(this.env)(v)
    }
    public evalAll(this: LispEvaluator, ...v: LispValue[]): LispValue[] {
        assert(this.env.evalAll != undefined)
        return (this.env.evalAll as LispFunction).bind(this.env)(...v) as LispValue[]
    }
    public pushThis(this: LispEvaluator): LispEvaluator {
        let ret = pushThis(this)
        ret.env = pushThis(this.env)
        return ret
    }
}

function variadicNumOp(pair: (x: number, y: number) => number): LispFunction {
    return function (...rv) {
        const v = (this.evalAll as LispFunction)(...rv) as LispValue[]
        const first = Number(v[0])
        if (first === NaN) {
            throw `error at function +: ${v[0]} is not a number`
        }
        return [first, ...v.slice(1)].reduce((acc, cur) => {
            switch (typeof cur) {
                case 'number':
                    return pair(acc as number, cur)
                case 'string':
                    const strnum = Number(cur as string)
                    if (isNaN(strnum)) {
                        throw `error at function +: ${cur} is not a number`
                    }
                    return pair(acc as number, strnum)
                default:
                    throw new Error(`unsupported type ${typeof cur}`)
            }
        })
    }
}
export function pushThis<T extends Object>(base: T, layer?: T | undefined) {
    let ret = (layer || {}) as any
    ret.__proto__ = base
    return ret as T
}

const baseLispEnvironment : LispEnvironment = {
    eval(v) {
        if (Array.isArray(v)) {
            if (v.length == 0) {
                throw new Error("tried to evaluate empty list")
            }
            return (this.evalFunction as LispFunction)(...v)
        }
        if (v == null) {
            return null
        }
        let ret: Record<string, LispValue> = {
            'string': v,
            'number': v,
            'boolean': v,
            'function': v,
            'undefined': null,
        }
        const chosen = ret[typeof v]
        if (chosen !== undefined) {
            return chosen
        } else {
            throw new Error(`invalid value of type ${typeof v}: ${v}`)
        }
    },
    evalAll(...v) {
        return v.map((cur) => (this.eval as LispFunction)(cur))
    },
    evalFunction(fn, ...expr) {
        let fnCandidate = fn
        assert(this.isFunction)
        if (Array.isArray(fnCandidate)) {
            const evaluated = (this.eval as LispFunction)(fnCandidate)
            return (this.evalFunction as LispFunction)(evaluated, expr)
        }
        if (typeof fnCandidate == 'string') {
            fnCandidate = this[fnCandidate] as LispFunction
        }
        if (typeof fnCandidate !== 'function') {
            throw new Error("can't call something that is not a function")
        }
        // const pushedThis = pushThis(this)
        return fnCandidate.bind(this)(...expr)/*.bind(pushedThis as unknown as LispEnvironment)*/ 
    },
    car(rv) {
        const v = (this.eval as LispFunction)(rv)
        if (Array.isArray(v)) {
            if (v.length > 0) {
                return v[0]
            }
        }
        return null
    },
    get(sym) {
        if ((this.isString as LispFunction)(sym)) {
            const ret = this[sym as string]
            if (ret != undefined) {
                return ret
            }
        }
        return null
    },
    sym(sym) {
        return () => (this.get as LispFunction)(sym)
    },
    cdr(rv) {
        const v = (this.eval as LispFunction)(rv)
        if (Array.isArray(v)) {
            if (v.length > 0) {
                return v.slice(1)
            }
        }
        return []
    },
    quote(rv) {
        return rv
    },
    isFunction(rv) {
        return typeof (this.eval as LispFunction)(rv) === 'function'
    },
    isString(rv) {
        return typeof (this.eval as LispFunction)(rv) === 'string'
    },
    "if": function (cond, a, b) {
        return (this.eval as LispFunction)(
            (this.intoBool as LispFunction)(cond)
            ? a
            : b
        )
    },
    intoBool(v) {
        return Boolean(v)
    },
    intoString(v) {
        return String(v)
    },
    "+": variadicNumOp((x, y) => x + y),
    "-": variadicNumOp((x, y) => x - y),
    "*": variadicNumOp((x, y) => x * y),
    "/": variadicNumOp((x, y) => x / y),
    concat(...rv) {
        const v = (this.evalAll as LispFunction)(...rv) as LispValue[]
        const that = this
        return ['', ...v].reduce((acc, cur) => {
            let txt = (that.intoString as LispFunction)(cur)
            return acc + (txt as string)
        })
    },
    "let": function (...rv) {
        if (rv.length % 2 == 0) {
            throw new Error("[let, key, value, key, value, ..., ret]")
        }
        let newEnv = pushThis(this)
        for (let i = 0; i < (rv.length - 1) / 2; i++) {
            const key = (this.eval as LispFunction).bind(newEnv)(rv[i*2])
            if (typeof key != 'string') {
                throw new Error(`variable key is a ${typeof key} but must be string`)
            }
            const value = (this.eval as LispFunction).bind(newEnv)(rv[i*2 + 1])
            newEnv[key] = value
        }
        return (this.eval as LispFunction).bind(newEnv)(rv[rv.length - 1])
    },
    eq(a, b) {
        const [x, y] = (this.evalAll as LispFunction)(a, b) as [LispValue, LispValue]
        if (typeof x != typeof y) {
            return false
        }
        if (Array.isArray(x)) {
            if (!Array.isArray(y)) {
                return false
            }
            return x === y
        }
        if (x == null) {
            return y == null
        }
        switch (typeof x) {
            case 'number':
                return x == y
            case 'string':
                return x === y
            case 'boolean':
                return x == y
            default:
                throw new Error(`base type comparation ${typeof x} is not implemented`)
        }
    },
    "assert": function (a, b) {
        const [check, msg] = (this.evalAll as LispFunction)(a, b) as [LispValue, LispValue]
        if ((this.intoBool as LispFunction)(check)) {
            return null
        }
        if (msg) {
            throw new Error(String(msg))
        }
        throw new Error(`assertion failed: ${String(a)}`)
    },
    "throw": function (a) {
        const [msg] = (this.evalAll as LispFunction)(a) as [LispValue, LispValue]
        const msgStr = (this.intoString as LispFunction)(msg)
        throw new Error(String(msgStr))
    },
    "try": function (expr) {
        try {
            const ret = (this.eval as LispFunction)(expr)
            return ret
        } catch (e) {
            return ['error', e.message ? e.message : String(e)]
        }
    },
    not(expr) {
        const evaluated = (this.eval as LispFunction)(expr)
        const booleaned = (this.intoBool as LispFunction)(evaluated)
        return !booleaned
    }
} 
export type LispValue = LispFunction | number | string | LispValue[] | boolean | null
export type LispFunction = (...v: LispValue[]) => LispValue
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
        if (options?.extraEnv) {
            const extraEnv = options.extraEnv as any
            extraEnv.__proto__ = this.env
            this.env = options.extraEnv
        }
    }
    public pushThis(): LispEvaluator {
        let ret = Object.create(this)
        ret.env = Object.create(this.env)
        return ret
    }
    public eval(v: LispValue): LispValue {
        if (Array.isArray(v)) {
            if (v.length == 0) {
                throw new Error("tried to evaluate empty list")
            }
            return this.evalFunction(v)
        }
        switch (typeof v) {
            case 'string':
                return v
            case 'number':
                return v
            case 'boolean':
                return v
            case 'function':
                return v
            case 'undefined':
                return null
            default:
                throw new Error(`invalid value of type ${typeof v}: ${v}`)
        }
    }
    public evalFunction(expr: LispValue[]): LispValue {
        let fnCandidate = expr[0]
        if (typeof fnCandidate == 'string') {
            if (fnCandidate === 'quote') {
                if (expr.length == 1) {
                    return null
                } else {
                    return expr[1]
                }
            }
            fnCandidate = this.env[fnCandidate] as LispFunction
        }
        if (!(this.env.isFunction as LispFunction)(fnCandidate)) {
            console.log(fnCandidate)
            throw new Error("can't call something that is not a function")
        }
        const that = this
        const evaluatedElements = expr.slice(1).map((curExpr) =>
            that.eval.bind(this.pushThis())(curExpr)
        )
        return (fnCandidate as LispFunction).bind(this.pushThis())(...evaluatedElements)
    }
    public responder(req: LispRequest): LispValue[] {
        const that = this
        return req.actions.map((req) => that.eval.bind(that.pushThis())(req))
    }
}



const baseLispEnvironment : LispEnvironment = {
    car(v) {
        if (Array.isArray(v)) {
            if (v.length > 0) {
                return v[0]
            }
        }
        return null
    },
    cdr(v) {
        if (Array.isArray(v)) {
            if (v.length > 0) {
                return v.slice(1)
            }
        }
        return []
    },
    isFunction(v) {
        return typeof v == 'function'
    },
    '+': function (...v) {
        return v.reduce((acc, cur) => {
            switch (typeof cur) {
                case 'number':
                    return (acc as number) + cur
                case 'string':
                    const strnum = parseFloat(cur as string)
                    if (isNaN(strnum)) {
                        throw `error at function +: ${cur} is not a number`
                    }
                    return (acc as number) + strnum
                default:
                    throw new Error(`unsupported type ${typeof cur}`)
            }
        })
    }
} 
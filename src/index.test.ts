import LispEvaluator, { LispFunction, LispValue } from './index'

const ev = new LispEvaluator()

test('number eval works', () => {
    expect(ev.eval(2)).toBe(2)
})

test('quote works', () => {
    expect(ev.eval(['quote', 2])).toBe(2)
})

test('isString works', () => {
    expect(ev.eval(['isString', 'test'])).toBeTruthy()
})

test('get works', () => {
    const that = ev.pushThis()
    that.env['test'] = 2
    expect(that.eval(['get', 'test'])).toBe(2)
})

test('sym works', () => {
    const that = ev.pushThis()
    that.env['test'] = 2
    expect(that.eval([['sym', 'test']])).toBe(2)
})

test('evalAll works', () => {
    expect(ev.evalAll(1, "eoq", ['quote', 2])).toStrictEqual([1, 'eoq', 2])
})

test('isFunction works', () => {
    const [first, second] = ev.evalAll(['isFunction', ['get', 'car']], ['isFunction', () => true])
    expect(first).toBeTruthy()
    expect(second).toBeTruthy()
})

test('should not side effect pushThis', () => {
    const that = ev.pushThis()
    that.env['test'] = 2
    expect(ev.env['test']).toBeUndefined()
})


test('should accept custom values', () => {
    const l = new LispEvaluator({
        extraEnv: {
            sum(x, y) {
                const [a, b] = (this.evalAll as LispFunction)(x, y) as LispValue[]
                if (typeof a === 'number' && typeof b === 'number') {
                    return a + b
                }
                throw new Error(`not a number: ${a}, ${b}`)
            }
        }
    })
    expect(l.eval(['sum', 3, 3])).toBe(6)
    expect(() => l.eval(['sum', "eoq", "trabson"])).toThrowError()
})

test('should pushThis return in shape', () => {
    const that = ev.pushThis()
    expect(that.env['car']).toBeDefined()
    expect(that.env['eval']).toBeDefined()
    expect(that.env['evalAll']).toBeDefined()
})

test('should eval car of a simple list', () => {
    expect(ev.eval(['car', ['quote', [1, 2, 3]]])).toStrictEqual(1)
})

test('should eval cdr of a simple list', () => {
    expect(ev.eval(['cdr', ['quote', [1, 2, 3]]])).toStrictEqual([2, 3])
})

test('should eval cdr of cdr of a simple list', () => {
    expect(ev.eval(
        [
            'cdr', [
                'cdr', [
                    'quote', [1, 2, 3]
                ]
            ]
        ]
        )).toStrictEqual([3])
})

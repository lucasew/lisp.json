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

test('if works', () => {
    expect(ev.eval(['if', true, 1, 2])).toBe(1)
    expect(ev.eval(['if', false, 1, 2])).toBe(2)
})

test('+ works', () => {
    expect(ev.eval(['+', 1, 2, 3, 4])).toBe(10)
    expect(ev.eval(['+', '2', '2'])).toBe(4)
})

test('- works', () => {
    expect(ev.eval(['-', 20, 6, 4, 1])).toBe(9)
})

test('* works', () => {
    expect(ev.eval(['*', 2, 10, 4])).toBe(80)
})

test('/ works', () => {
    expect(ev.eval(['/', 50, 5, 3])).toBe(10/3)
})

test('concat works', () => {
    expect(ev.eval(['concat', 'teste: ', 24])).toBe("teste: 24")
})

test('intoString works', () => {
    expect(ev.eval(['intoString', 1])).toBe('1')
    expect(ev.eval(['intoString', null])).toBe('null')
    expect(ev.eval(['intoString', 3.4])).toBe('3.4')
})

test('eq works', () => {
    expect(ev.eval(['eq', 2, 2])).toBe(true)
    expect(ev.eval(['eq', 2, '2'])).toBe(false)
    expect(ev.eval(['eq', '2', '2'])).toBe(true)
    expect(ev.eval(['eq', ['quote', 2], 2])).toBe(true)
    expect(ev.eval(['eq', false, null])).toBe(false)
})

test('assert works', () => {
    expect(() => ev.eval(['assert', false, 'this must happen'])).toThrow()
    expect(ev.eval(['assert', ['eq', 2, 2], 'this must happen'])).toBeNull()
})

test('throw works', () => {
    expect(() => ev.eval(['throw', 'this must happen'])).toThrow('this must happen')
    expect(() => ev.eval([
        'let', 'sometext', 'yes',
        ['throw', ['get', 'sometext']]
    ])).toThrow('yes')
})

test('try works', () => {
    expect(ev.eval(['try', ['throw', 'test']])).toStrictEqual(['error', 'test'])
})

test('not works', () => {
    expect(ev.eval(['not', true])).toBe(false)
    expect(ev.eval(['not', false])).toBe(true)
})

test('let works', () => {
    expect(ev.eval([
        'let', 
        'name', 'lisp.json',
        'language', 'typescript',
        'math', ['+', 2, '2'],
        ['concat', 
            'The name of the project is ', 
            ['get', 'name'], 
            ' and its written in ', 
            ['get', 'language'], 
            '. Random math: ', 
            ['get', 'math']
        ]
    ])).toBe('The name of the project is lisp.json and its written in typescript. Random math: 4')
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

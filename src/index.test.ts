import LispEvaluator from './index'

const ev = new LispEvaluator()

test('should not side effect pushThis', () => {
    const that = ev.pushThis()
    that.env['test'] = 2
    expect(ev.env['test']).toBeUndefined()
})

test('should pushThis return in shape', () => {
    const that = ev.pushThis()
    expect(that.env['car']).toBeDefined()
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

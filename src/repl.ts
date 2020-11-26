import { stdin, stdout } from 'process'
import readline from 'readline'
import LispEvaluator from '.'

async function runRepl() {
    const asker = readline.createInterface(stdin, stdout)
    const vm = new LispEvaluator({
        extraEnv: {
            setg(k, v) {
                if (typeof k != 'string') {
                    throw new Error('variable name should be string')
                }
                this[k] = v
                return k
            }
        }
    })
    let buf = ''
    for(;;) {
        const line = await new Promise(
            (res) => asker.question(buf === '' ? '-> ' : ' > ', res)
        )
        buf = [buf, line].join('\n').replace(/'/g, '"')
        let obj = null
        try {
            obj = JSON.parse(buf)
        } catch (e) {
            console.log(`incomplete or invalid input: ${e}`)
            if (line == '') {
                buf = ''
            }
            continue
        }
        try {
            const evaluated = vm.eval(obj)
            console.log(evaluated)
        } catch (e) {
            console.log(`error: ${e.message || e}`)
            continue
        } finally {
            buf = ''
        }
    }
}

runRepl()
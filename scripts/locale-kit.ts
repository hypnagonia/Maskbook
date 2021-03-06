import { promises as fs, readdirSync } from 'fs'
import _ from 'lodash'
import path from 'path'
import ts from 'typescript'
import { run } from './utils'

const SOURCE_PATH = path.join(__dirname, '..', 'src')
const LOCALE_PATH = path.join(SOURCE_PATH, '_locales')

const _locales = readdirSync(LOCALE_PATH)

async function* walk(dir: string): AsyncIterableIterator<string> {
    for await (const dirent of await fs.opendir(dir)) {
        const entry = path.join(dir, dirent.name)
        if (dirent.isDirectory()) {
            yield* walk(entry)
        } else if (dirent.isFile() && /\.(tsx?)$/.test(entry)) {
            yield entry
        }
    }
}

async function readMessages(name: string) {
    const target = path.join(LOCALE_PATH, name, 'messages.json')
    return JSON.parse(await fs.readFile(target, 'utf-8'))
}

async function writeMessages(name: string, messages: unknown) {
    const target = path.join(LOCALE_PATH, name, 'messages.json')
    await fs.writeFile(target, JSON.stringify(messages, null, 4) + '\n', 'utf-8')
}

function getUsedKeys(content: string) {
    const keys = new Set<string>()
    const closest = <T extends ts.Node>(node: ts.Node, match: (node: ts.Node) => node is T): T | undefined => {
        while (node) {
            if (match(node)) {
                return node
            }
            node = node.parent
        }
        return undefined
    }
    const transformer = (context: ts.TransformationContext) => (rootNode: ts.Node) => {
        const setFromVariableWrapper = (variableValue: string): ((node: ts.Node) => ts.Node) => {
            const setFromVariable = (node: ts.Node): ts.Node => {
                if (
                    ts.isVariableDeclaration(node) &&
                    ts.isVariableDeclarationList(node.parent) &&
                    !(node.parent.flags ^ ts.NodeFlags.Const) &&
                    ts.isIdentifier(node.name) &&
                    node.name.text === variableValue &&
                    node.initializer &&
                    ts.isStringLiteralLike(node.initializer)
                ) {
                    keys.add(node.initializer.text)
                }
                return ts.visitEachChild(node, setFromVariable, context)
            }
            return setFromVariable
        }
        const addKey = (node: ts.Node) => {
            if (ts.isStringLiteralLike(node)) {
                keys.add(node.text)
            } else if (ts.isIdentifier(node)) {
                setFromVariableWrapper(node.text)(rootNode)
            } else if (ts.isJsxExpression(node) && node.expression) {
                setFromVariableWrapper(node.expression.getText())(rootNode)
            }
        }
        const visit: ts.Visitor = (node) => {
            if (ts.isIdentifier(node) && node.text === 't') {
                const localeKey = closest(node, ts.isCallExpression)?.arguments[0]
                if (localeKey === undefined) {
                    return node
                } else if (ts.isConditionalExpression(localeKey)) {
                    addKey(localeKey.whenTrue)
                    addKey(localeKey.whenFalse)
                } else {
                    addKey(localeKey)
                }
            } else if (ts.isJsxAttribute(node) && node.name.escapedText === 'i18nKey' && node.initializer) {
                addKey(node.initializer)
            }
            return ts.visitEachChild(node, visit, context)
        }
        return ts.visitNode(rootNode, visit)
    }
    ts.transform(ts.createSourceFile('', content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX), [transformer])
    return keys
}

async function findAllUnusedKeys() {
    const usedKeys: string[] = []
    const keys = _.keys(await readMessages('en'))
    for await (const file of walk(SOURCE_PATH)) {
        usedKeys.push(...getUsedKeys(await fs.readFile(file, 'utf-8')))
    }
    return _.difference(keys, usedKeys)
}

async function findAllUnsyncedLocales(locales = _.without(_locales, 'en')) {
    const keys = _.keys(await readMessages('en'))
    const names: string[] = []
    for (const name of locales) {
        const nextKeys = _.keys(await readMessages(name))
        const diffKeys = _.difference(keys, nextKeys)
        if (diffKeys.length) {
            names.push(name)
        }
    }
    return names
}

async function removeAllUnusedKeys(keys: string[], locales = _locales) {
    for (const name of locales) {
        const modifedMessages = _.omit(await readMessages(name), keys)
        await writeMessages(name, modifedMessages)
    }
}

async function syncKey(locales = _.without(_locales, 'en')) {
    const baseMessages = await readMessages('en')
    const baseKeys = _.keys(baseMessages)
    for (const name of locales) {
        const nextMessages = await readMessages(name)
        const emptyKeys = _.reduce(
            _.difference(baseKeys, _.keys(nextMessages)),
            (record, name) => {
                record[name] = ''
                return record
            },
            {} as Record<string, string>,
        )
        const modifedMessages = _.chain(nextMessages)
            .assign(emptyKeys)
            .toPairs()
            .sortBy(([key]) => baseKeys.indexOf(key))
            .fromPairs()
            .value()
        await writeMessages(name, modifedMessages)
    }
}

async function main() {
    const unusedKeys = await findAllUnusedKeys()
    console.error('Scanned', unusedKeys.length, 'unused keys')
    console.error('Unsynced', await findAllUnsyncedLocales(), 'locales')
    if (process.argv.includes('--remove-unused-keys')) {
        await removeAllUnusedKeys(unusedKeys)
        console.log('Unused keys removed')
    }
    if (process.argv.includes('--sync-key')) {
        await syncKey()
        console.log('Synced keys')
    }
}

main().then(() => {
    run(undefined, 'git', 'add', 'src/_locales')
})

import { batchReplace, regexMatchAll } from '../../utils/utils'
import { isNull } from 'lodash-es'
import anchorme from 'anchorme'

const ICAO9303Checksum = {
    encode: (input: string) => {
        return `${input}${(
            input
                .toUpperCase()
                .replace(/[+=\/]/g, '0')
                .split('')
                .map((d, i) => parseInt(d, 36) * [7, 3, 1][i % 3])
                .reduce((l, r) => l + r, 0) % 19
        )
            .toString(19)
            .toUpperCase()}`
    },
    decode: (input: string) => {
        const content = input.slice(0, input.length - 1)
        const checksum = input.slice(input.length - 1)
        const r = ICAO9303Checksum.encode(content)
        if (checksum === r.slice(r.length - 1)) {
            return content
        } else {
            return null
        }
    },
}

export const twitterEncoding = {
    /**
     * @link https://github.com/DimensionDev/Maskbook/issues/191
     */
    publicKeyEncoder: (text: string) => `🎭${ICAO9303Checksum.encode(text)}🎭`,
    publicKeyDecoder: (text: string): string[] => {
        const r = regexMatchAll(text, /([\dA-Za-z+=\/]{20,60})/)
        if (isNull(r)) {
            return []
        }
        for (const v of r) {
            const retV = ICAO9303Checksum.decode(v)
            if (isNull(retV)) {
                continue
            }
            return [retV]
        }
        return []
    },
    /**
     * @link https://github.com/DimensionDev/Maskbook/issues/198
     */
    payloadEncoder: (text: string) =>
        `https://maskbook.com/?PostData_v1=${batchReplace(text, [
            ['🎼', '%20'],
            [':||', '%40'],
            ['+', '-'],
            ['=', '_'],
            [/\|/g, '.'],
        ])}`,
    payloadDecoder: (text: string) => {
        if (!text) return null
        if (!text.includes('%20') || !text.includes('%40')) return null
        const links: { raw: string; protocol: string; encoded: string }[] = anchorme(text, { list: true })
        const payloadLink = links
            .map((l) => ({
                ...l,
                raw: l.raw.replace(/…$/, ''),
            }))
            .filter((x) => x.raw.endsWith('%40'))[0]?.raw
        try {
            const { search, pathname } = new URL(payloadLink)
            const payload = search ? search.slice(1) : pathname.slice(1)
            if (!payload) return null
            return `🎼${batchReplace(
                payload
                    .replace(/^PostData_v\d=/i, '')
                    .replace(/^%20/, '')
                    .replace(/%40$/, ''),
                [
                    ['-', '+'],
                    ['_', '='],
                    [/\./g, '|'],
                ],
            )}:||`
        } catch {
            return null
        }
    },
}

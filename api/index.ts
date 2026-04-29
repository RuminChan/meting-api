import type { VercelRequest, VercelResponse } from '@vercel/node'
import Meting from '@meting/core'

const COOKIE = process.env.QQ_MUSIC_COOKIE || ''
const TOKEN = process.env.METING_TOKEN || ''

const api = new Meting({
    server: 'tencent',
    cookie: COOKIE,
    token: TOKEN,
})

function parseQuery(url: string) {
    const query: Record<string, string> = {}
    const qIndex = url.indexOf('?')
    if (qIndex === -1) return query
    url.slice(qIndex + 1).split('&').forEach(p => {
        const [k, v] = p.split('=')
        if (k) query[decodeURIComponent(k)] = decodeURIComponent(v || '')
    })
    return query
}

function normalizeServer(s: string): string {
    const lower = s.toLowerCase()
    if (lower === 'tencent' || lower === 'tx' || lower === 'qq') return 'tencent'
    if (lower === 'netease' || lower === 'ne' || lower === '163') return 'netease'
    return 'tencent'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const url = req.url || '/'
    const query = parseQuery(url)

    const server = normalizeServer(query.server || query.source || '')
    const type = (query.type || 'song').toLowerCase()
    const id = query.id || query.ids || query.mid || query.songmid || ''
    const limit = parseInt(query.limit) || 30
    const offset = parseInt(query.offset) || 0

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
        res.status(204).send('')
        return
    }

    if (!id) {
        res.status(400).json({ error: 'Missing id parameter' })
        return
    }

    try {
        switch (type) {
            case 'url':
            case 'song': {
                const data = await api.url(id, server) as any
                const songUrl = data?.url || (data?.[0] as any)?.url || ''
                res.status(200).json({ data: songUrl ? [{ url: songUrl }] : [] })
                break
            }
            case 'detail': {
                const result = await api.song(id)
                res.status(200).json(result)
                break
            }
            case 'playlist': {
                const result = await api.playlist(id)
                res.status(200).json(result)
                break
            }
            case 'search': {
                const result = await api.search(id, { limit, offset })
                res.status(200).json(result)
                break
            }
            case 'lyric': {
                const result = await api.lyric(id)
                res.status(200).json(result)
                break
            }
            case 'pic': {
                const picUrl = await api.pic(id, 0)
                res.status(200).send(picUrl || '')
                break
            }
            default: {
                res.status(400).json({ error: `Unknown type: ${type}` })
            }
        }
    } catch (err: any) {
        res.status(500).json({ error: 'Internal Server Error', message: err.message })
    }
}

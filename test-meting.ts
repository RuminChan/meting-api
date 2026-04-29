import Meting from '@meting/core'

const COOKIE = process.env.QQ_MUSIC_COOKIE || ''
const TOKEN = process.env.METING_TOKEN || ''

const api = new Meting({
    server: 'tencent',
    cookie: COOKIE,
    token: TOKEN,
})

async function main() {
    console.log('Testing QQ Music search...')
    try {
        const r = await api.search('周杰伦', { limit: 3 })
        console.log(JSON.stringify(r, null, 2))
    } catch (e: any) {
        console.error('Search error:', e.message)
    }

    console.log('\nTesting song URL...')
    try {
        // 用一个已知的QQ音乐歌曲ID测试
        const url = await api.url('0039MnY2R9d7V4', 'tencent')
        console.log('URL result:', JSON.stringify(url, null, 2))
    } catch (e: any) {
        console.error('URL error:', e.message)
    }
}

main()

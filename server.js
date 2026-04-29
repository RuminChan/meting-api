import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Meting from './src/meting.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.status(204).send('');
    }
    next();
});

app.post('/meting/api', async (req, res) => {
    try {
        const { cookie, server, type, id, limit, br, size } = req.body;

        if (!cookie) {
            return res.status(400).json({ error: 'Missing required parameter: cookie' });
        }

        if (!type) {
            return res.status(400).json({ error: 'Missing required parameter: type' });
        }

        const meting = new Meting(server || 'netease');
        meting.cookie(cookie);
        meting.format(true);

        let result;

        switch (type.toLowerCase()) {
            case 'search':
                result = await meting.search(id, { limit: limit || 30 });
                break;
            case 'song':
                result = await meting.song(id);
                break;
            case 'album':
                result = await meting.album(id);
                break;
            case 'artist':
                result = await meting.artist(id, limit || 50);
                break;
            case 'playlist':
                result = await meting.playlist(id);
                break;
            case 'url':
                result = await meting.url(id, br || 320);
                break;
            case 'lyric':
                result = await meting.lyric(id);
                break;
            case 'pic':
                result = await meting.pic(id, size || 300);
                break;
            default:
                return res.status(400).json({ error: `Unknown type: ${type}` });
        }

        try {
            res.json({ success: true, data: JSON.parse(result) });
        } catch {
            res.json({ success: true, data: result });
        }

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/meting/doc', (req, res) => {
    res.sendFile(join(__dirname, 'public', 'doc.html'));
});

app.get('/', (req, res) => {
    res.redirect('/meting/doc');
});

app.listen(PORT, () => {
    console.log(`Meting API Server running at http://localhost:${PORT}`);
    console.log(`Documentation: http://localhost:${PORT}/meting/doc`);
});

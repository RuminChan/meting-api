import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Meting from './src/meting.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3000;

// 配置常量
const RATE_LIMIT = 300; // 每个 IP 相同接口限制次数
const BLACKLIST_DURATION = 5 * 60 * 1000; // 黑名单 5 分钟（毫秒）
const WINDOW_DURATION = 1 * 60 * 1000; // 统计窗口 1 分钟

// 数据存储
const ipStats = new Map(); // IP -> endpoint -> { count: number, startTime: number }
const blacklist = new Map(); // IP -> { startTime: number, reason: string }

// 获取客户端真实 IP
function getClientIp(req) {
    return req.ip ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        (req.connection?.socket ? req.connection.socket.remoteAddress : null) ||
        'unknown';
}

// 清理过期数据
function cleanupExpiredData() {
    const now = Date.now();
    
    // 清理过期的 IP 统计
    for (const [ip, endpoints] of ipStats) {
        for (const [endpoint, data] of endpoints) {
            if (now - data.startTime > WINDOW_DURATION) {
                endpoints.delete(endpoint);
            }
        }
        if (endpoints.size === 0) {
            ipStats.delete(ip);
        }
    }
    
    // 清理过期的黑名单
    for (const [ip, data] of blacklist) {
        if (now - data.startTime > BLACKLIST_DURATION) {
            console.log(`IP ${ip} 已从黑名单移除`);
            blacklist.delete(ip);
        }
    }
}

// 检查是否在黑名单
function isBlacklisted(ip) {
    const entry = blacklist.get(ip);
    if (!entry) return false;
    
    const now = Date.now();
    if (now - entry.startTime > BLACKLIST_DURATION) {
        blacklist.delete(ip);
        return false;
    }
    
    return true;
}

// 添加到黑名单
function addToBlacklist(ip, reason = '') {
    blacklist.set(ip, {
        startTime: Date.now(),
        reason: reason
    });
    console.warn(`IP ${ip} 已加入黑名单: ${reason}`);
}

// 检查并更新调用次数
function checkRateLimit(ip, endpoint) {
    const now = Date.now();
    
    // 获取或创建该 IP 的统计数据
    if (!ipStats.has(ip)) {
        ipStats.set(ip, new Map());
    }
    
    const endpointStats = ipStats.get(ip);
    
    // 获取或创建该接口的统计
    if (!endpointStats.has(endpoint)) {
        endpointStats.set(endpoint, {
            count: 1,
            startTime: now
        });
        return { allowed: true };
    }
    
    const stats = endpointStats.get(endpoint);
    
    // 检查是否需要重置窗口
    if (now - stats.startTime > WINDOW_DURATION) {
        stats.count = 1;
        stats.startTime = now;
        return { allowed: true };
    }
    
    // 增加计数
    stats.count += 1;
    
    // 检查是否超过限制
    if (stats.count > RATE_LIMIT) {
        addToBlacklist(ip, `超过速率限制: ${endpoint}`);
        return { allowed: false };
    }
    
    return { allowed: true };
}

// 限流中间件
function rateLimitMiddleware(req, res, next) {
    const ip = getClientIp(req);
    const endpoint = `${req.method} ${req.path}`;
    
    // 清理过期数据
    cleanupExpiredData();
    
    // 检查是否在黑名单
    if (isBlacklisted(ip)) {
        const blacklistEntry = blacklist.get(ip);
        const remaining = Math.ceil((BLACKLIST_DURATION - (Date.now() - blacklistEntry.startTime)) / 1000);
        
        return res.status(429).json({
            success: false,
            error: 'Too Many Requests',
            message: `IP 已被临时封禁，请 ${remaining} 秒后再试`,
            retryAfter: remaining
        });
    }
    
    // 只对 API 接口限流，不限制静态资源
    if (req.path.startsWith('/meting/api')) {
        const result = checkRateLimit(ip, endpoint);
        
        if (!result.allowed) {
            return res.status(429).json({
                success: false,
                error: 'Too Many Requests',
                message: '请求频率过高，请稍后再试'
            });
        }
    }
    
    next();
}

// 获取限流统计信息
function getRateLimitStats() {
    const stats = {
        activeIps: ipStats.size,
        blacklistCount: blacklist.size,
        blacklist: []
    };
    
    for (const [ip, data] of blacklist) {
        const remaining = Math.ceil((BLACKLIST_DURATION - (Date.now() - data.startTime)) / 1000);
        stats.blacklist.push({
            ip: ip,
            reason: data.reason,
            remaining: remaining
        });
    }
    
    return stats;
}

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// 应用限流中间件
app.use(rateLimitMiddleware);

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

// 管理接口：查看限流统计
app.get('/meting/admin/stats', (req, res) => {
    const stats = getRateLimitStats();
    res.json({
        success: true,
        data: stats
    });
});

// 管理接口：手动移除黑名单 IP
app.delete('/meting/admin/blacklist/:ip', (req, res) => {
    const ip = decodeURIComponent(req.params.ip);
    
    if (blacklist.has(ip)) {
        blacklist.delete(ip);
        console.log(`手动从黑名单移除 IP: ${ip}`);
        res.json({ success: true, message: `IP ${ip} 已从黑名单移除` });
    } else {
        res.status(404).json({ success: false, message: `IP ${ip} 不在黑名单中` });
    }
});

app.get('/', (req, res) => {
    res.redirect('/meting/doc');
});

app.listen(PORT, () => {
    console.log(`Meting API Server running at http://localhost:${PORT}`);
    console.log(`Documentation: http://localhost:${PORT}/meting/doc`);
    console.log(`Admin Stats: http://localhost:${PORT}/meting/admin/stats`);
    console.log('');
    console.log('限流配置:');
    console.log(`  - 每个 IP 相同接口限制: ${RATE_LIMIT} 次`);
    console.log(`  - 统计时间窗口: ${WINDOW_DURATION / 1000 / 60} 分钟`);
    console.log(`  - 黑名单封禁时间: ${BLACKLIST_DURATION / 1000 / 60} 分钟`);
});

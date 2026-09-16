import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import * as data from './data';
import * as operations from './discord/operations2';
import { fetchMembers } from './discord/client2';
import setupRouter from './setup';
import { isConfigured } from './config';
import { ensureSeedPresets } from './seed';
import { DATA_DIR, ASSETS_DIR, WEB_DIST } from './paths';

dotenv.config();

const app = express();

// Ensure data directories exist
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(ASSETS_DIR, { recursive: true });

// Multer setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, ASSETS_DIR);
    },
    filename: (req, file, cb) => {
        // preserve extension
        const ext = path.extname(file.originalname);
        const id = randomUUID();
        cb(null, `${id}${ext}`);
    }
});
const upload = multer({ storage });

app.use(express.json());

// Serve static files from web/dist
app.use(express.static(WEB_DIST));

// Serve assets
app.use('/assets', express.static(ASSETS_DIR));

// API Routes

// Setup
app.use('/api/setup', setupRouter);

// Guard: Discord-dependent APIs require configuration
app.use(['/api/guild', '/api/run', '/api/debug'], (req, res, next) => {
    if (!isConfigured()) {
        return res.status(409).json({ error: 'NOT_CONFIGURED' });
    }
    next();
});

// Shared error responder for Discord-dependent routes.
// A Discord 401 (DiscordAPIError) means the stored token is dead — surface a
// readable Japanese hint instead of the raw upstream message.
const sendError = (res: express.Response, e: any) => {
    if (e?.status === 401) {
        return res.status(401).json({
            error: 'Discord に接続できません。Bot トークンが無効か、Developer Portal でリセットされた可能性があります。左下の「セットアップ」からやり直してください。',
            code: 'DISCORD_UNAUTHORIZED'
        });
    }
    res.status(500).json({ error: e.message });
};

// Presets
app.get('/api/presets', (req, res) => {
    try {
        const presets = data.getPresets();
        res.json(presets);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/presets', (req, res) => {
    try {
        // Can be a single preset or array. User requirement says "save (all or one)".
        // If array, replace all. If object, add/update one.
        // Let's support both or just stick to one. "save globally" is easiest for UI state.
        // But `data.ts` has `savePreset` (one).
        // Let's assume UI sends one preset to save/update.
        const preset = req.body;
        if (!preset.presetId) preset.presetId = randomUUID();
        data.savePreset(preset);
        res.json({ success: true, preset });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/presets/:id', (req, res) => {
    try {
        data.deletePreset(req.params.id);
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Seeds the sample preset for the chosen language — only when there are no
// presets yet (first run). Existing users get { ok, skipped } and nothing
// is written.
app.post('/api/presets/seed', (req, res) => {
    try {
        const language = req.body?.language;
        const result = ensureSeedPresets(typeof language === 'string' ? language : 'ja');
        res.json(result === 'written' ? { ok: true } : { ok: true, skipped: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Assets
app.post('/api/assets/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) throw new Error('No file uploaded');
        const assetId = path.basename(req.file.filename, path.extname(req.file.filename)); // technically filename is id+ext.
        // But wait, my data.ts assumption regarding assetId might need unique ID without extension?
        // Or just use filename as assetId.
        // Let's use the full filename as assetId to make life easier or store map.
        // My multer config saves as `uuid.ext`.
        // Let's return assetId as the filename.

        res.json({
            assetId: req.file.filename, // Use filename as ID to keep extension
            path: `/assets/${req.file.filename}`
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// Run Operations
app.post('/api/run/create', async (req, res) => {
    try {
        const { presetId, categoryName, memberIds } = req.body;
        if (!presetId || !categoryName || !memberIds) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const result = await operations.runCreate(presetId, categoryName, memberIds);
        res.json(result);
    } catch (e: any) {
        console.error("Create run failed:", e);
        sendError(res, e);
    }
});

app.post('/api/run/delete', async (req, res) => {
    try {
        const { categoryIds } = req.body;
        if (!categoryIds || !Array.isArray(categoryIds)) {
            return res.status(400).json({ error: 'Missing categoryIds array' });
        }

        const result = await operations.runDelete(categoryIds);
        res.json(result);
    } catch (e: any) {
        console.error("Delete run failed:", e);
        sendError(res, e);
    }
});

app.get('/api/debug/members-raw', async (req, res) => {
    try {
        const raw = await fetchMembers(10) as any[];
        const debug = raw.map((m: any) => ({
            username: m.user.username,
            bot: m.user.bot,
            system: m.user.system,
            flags: m.user.public_flags,
            id: m.user.id
        }));
        res.json({ total: raw.length, members: debug });
    } catch (e: any) {
        sendError(res, e);
    }
});

app.get('/api/guild/members', async (req, res) => {
    try {
        const { limit, after } = req.query;
        const members = await operations.getGuildMembers(
            limit ? Number(limit) : undefined,
            after as string
        );
        res.json(members);
    } catch (e: any) {
        console.error("Fetch members failed:", e);
        sendError(res, e);
    }
});

app.get('/api/guild/categories', async (req, res) => {
    try {
        const categories = await operations.getGuildCategories();
        res.json(categories);
    } catch (e: any) {
        console.error("Fetch categories failed:", e);
        sendError(res, e);
    }
});

// Open the data directory in the OS file manager
app.post('/api/system/open-data-dir', (req, res) => {
    try {
        const cmd = process.platform === 'win32' ? 'explorer' : process.platform === 'darwin' ? 'open' : 'xdg-open';
        spawn(cmd, [DATA_DIR], { detached: true, stdio: 'ignore' }).unref();
        res.json({ ok: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});


// Unknown API routes return 404 JSON instead of the SPA fallback
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Fallback to index.html for SPA
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(WEB_DIST, 'index.html'));
});

// Starts the Express app. preferredPort 0 lets the OS pick a free port;
// otherwise EADDRINUSE retries port+1 up to 10 times.
export const startServer = (preferredPort: number): Promise<{ port: number; close: () => void }> => {
    return new Promise((resolve, reject) => {
        const attempt = (port: number, tries: number) => {
            const server = app.listen(port);
            server.once('error', (e: any) => {
                if (e.code === 'EADDRINUSE' && preferredPort !== 0 && tries < 10) {
                    attempt(port + 1, tries + 1);
                } else {
                    reject(e);
                }
            });
            server.once('listening', () => {
                const address = server.address();
                const port = typeof address === 'object' && address ? address.port : preferredPort;
                resolve({ port, close: () => server.close() });
            });
        };
        attempt(preferredPort, 0);
    });
};

if (require.main === module) {
    startServer(Number(process.env.PORT) || 3000).then(({ port }) => {
        console.log(`Server is running on http://localhost:${port}`);
        console.log(`Data directory: ${DATA_DIR}`);
        console.log(`Configured: ${isConfigured()}`);
    });
}

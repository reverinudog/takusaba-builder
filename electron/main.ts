import { app, BrowserWindow, Menu, dialog, shell } from 'electron';
import path from 'path';

// These must be set BEFORE src/paths.ts is evaluated (it reads env at import
// time), so the server module is loaded lazily via dynamic import below.
app.setName('Session Room Builder');
process.env.SRB_APP_ROOT = app.isPackaged
    ? app.getPath('userData') // %APPDATA%/Session Room Builder (win) / ~/Library/Application Support (mac)
    : path.join(__dirname, '..'); // dev `electron .`: repository root
process.env.SRB_WEB_DIST = path.join(app.getAppPath(), 'web/dist');

if (process.platform === 'darwin') {
    // Minimal menu — Edit roles are needed for copy/paste in the token field
    Menu.setApplicationMenu(Menu.buildFromTemplate([
        {
            label: app.name,
            submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'quit' }]
        },
        {
            label: 'Edit',
            submenu: [{ role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }]
        },
        {
            label: 'Window',
            submenu: [{ role: 'minimize' }, { role: 'close' }]
        }
    ]));
} else {
    Menu.setApplicationMenu(null);
}

let closeServer: (() => void) | null = null;

const createWindow = async () => {
    const { startServer } = await import('../src/server');
    const { port, close } = await startServer(0);
    closeServer = close;

    const win = new BrowserWindow({
        width: 1280,
        height: 860,
        minWidth: 1000,
        minHeight: 680,
        backgroundColor: '#060907',
        title: 'Session Room Builder',
        autoHideMenuBar: true,
        show: false,
        webPreferences: {
            contextIsolation: true,
            sandbox: true,
            nodeIntegration: false
        }
    });

    win.once('ready-to-show', () => win.show());

    // External links open in the system browser, never in-app
    win.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
    win.webContents.on('will-navigate', (e, url) => {
        if (!url.startsWith('http://127.0.0.1:')) {
            e.preventDefault();
            shell.openExternal(url);
        }
    });

    // The web app asks beforeunload when there are unsaved edits — translate
    // that into a native confirm dialog.
    win.webContents.on('will-prevent-unload', e => {
        const r = dialog.showMessageBoxSync(win, {
            type: 'warning',
            buttons: ['閉じる', 'キャンセル'],
            defaultId: 1,
            cancelId: 1,
            title: '未保存の変更',
            message: '保存していない変更があります。閉じると失われます。'
        });
        if (r === 0) e.preventDefault();
    });

    if (!app.isPackaged) {
        win.webContents.on('before-input-event', (_e, input) => {
            if (input.control && input.shift && input.key.toLowerCase() === 'i' && input.type === 'keyDown') {
                win.webContents.toggleDevTools();
            }
        });
    }

    win.loadURL(`http://127.0.0.1:${port}`);
};

app.whenReady().then(async () => {
    try {
        await createWindow();
    } catch (e) {
        dialog.showErrorBox('起動に失敗しました', e instanceof Error ? e.message : String(e));
        app.quit();
    }
});

// Closing the window quits the app on every platform (per product requirement)
app.on('window-all-closed', () => app.quit());

app.on('before-quit', () => {
    closeServer?.();
});

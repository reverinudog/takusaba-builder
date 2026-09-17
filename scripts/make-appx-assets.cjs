// Renders build-resources/icon.svg into the four Microsoft Store tile PNGs
// electron-builder expects in build-resources/appx/. Run: node scripts/make-appx-assets.cjs
// Uses the repo's Playwright install, same as make-icon.cjs.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT_DIR = path.join(__dirname, '../build-resources/appx');
const SIZES = {
    'StoreLogo.png': [50, 50],
    'Square44x44Logo.png': [44, 44],
    'Square150x150Logo.png': [150, 150],
    'Wide310x150Logo.png': [310, 150]
};

(async () => {
    const svgRaw = fs.readFileSync(path.join(__dirname, '../build-resources/icon.svg'), 'utf-8');
    fs.mkdirSync(OUT_DIR, { recursive: true });

    const browser = await chromium.launch();
    for (const [name, [w, h]] of Object.entries(SIZES)) {
        const side = Math.min(w, h);
        // Resize the svg itself before render — mutating attributes post-setContent is racy
        const svg = svgRaw.replace(/<svg([^>]*?)width="\d+"([^>]*?)height="\d+"/, `<svg$1width="${side}"$2height="${side}"`);
        const page = await browser.newPage({ viewport: { width: w, height: h } });
        await page.setContent(
            `<body style="margin:0">` +
            `<div style="display:flex;align-items:center;justify-content:center;width:${w}px;height:${h}px">${svg}</div>` +
            `</body>`
        );
        await page.screenshot({ path: path.join(OUT_DIR, name), omitBackground: true, clip: { x: 0, y: 0, width: w, height: h } });
        await page.close();
        console.log('wrote', name, `${w}x${h}`);
    }
    await browser.close();
})().catch(e => { console.error(e); process.exit(1); });

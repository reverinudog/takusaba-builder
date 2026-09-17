// Renders the Microsoft Store hero image: icon.svg centered on solid black,
// 1920x1080, no text. Run: node scripts/make-store-hero.cjs
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const W = 1920, H = 1080, SIDE = 560;
const OUT = path.join(__dirname, '../store/hero-1920x1080.png');

(async () => {
    const svg = fs.readFileSync(path.join(__dirname, '../build-resources/icon.svg'), 'utf-8')
        .replace(/<svg([^>]*?)width="\d+"([^>]*?)height="\d+"/, `<svg$1width="${SIDE}"$2height="${SIDE}"`);

    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: W, height: H } });
    await page.setContent(
        `<body style="margin:0;background:#000000">` +
        `<div style="display:flex;align-items:center;justify-content:center;width:${W}px;height:${H}px">${svg}</div>` +
        `</body>`
    );
    await page.screenshot({ path: OUT, clip: { x: 0, y: 0, width: W, height: H } });
    await browser.close();
    console.log('wrote', OUT);
})().catch(e => { console.error(e); process.exit(1); });

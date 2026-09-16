// Renders build-resources/icon.svg to build-resources/icon.png (1024x1024)
// using the repo's Playwright install. Run: npm run icon
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
    const svgPath = path.join(__dirname, '../build-resources/icon.svg');
    const outPath = path.join(__dirname, '../build-resources/icon.png');
    const svg = fs.readFileSync(svgPath, 'utf-8');

    const browser = await chromium.launch();
    const page = await browser.newPage({ viewportSize: { width: 1024, height: 1024 } });
    await page.setContent(`<body style="margin:0">${svg}</body>`);
    const el = await page.$('svg');
    await el.screenshot({ path: outPath, omitBackground: true });
    await browser.close();
    console.log('wrote', outPath);
})().catch(e => { console.error(e); process.exit(1); });

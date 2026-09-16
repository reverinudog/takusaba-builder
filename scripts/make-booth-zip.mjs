// Builds the two BOOTH distribution zips from release/ artifacts.
//   booth/out/卓鯖ビルダー_v<ver>_Windows.zip  (Setup exe + readme + LICENSE)
//   booth/out/卓鯖ビルダー_v<ver>_Mac.zip      (dmg + readme + LICENSE)
// Node stdlib only; zipping via powershell Compress-Archive (win) or zip -r.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(fileURLToPath(import.meta.url), '../..');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
const ver = pkg.version;

const setupExe = `TakusabaBuilder-Setup-${ver}.exe`;
const macDmg = `TakusabaBuilder-${ver}-mac.dmg`;
const releaseDir = path.join(ROOT, 'release');
const readmeSrc = path.join(ROOT, 'booth', 'はじめにお読みください.txt');
const licenseSrc = path.join(ROOT, 'LICENSE');
const outDir = path.join(ROOT, 'booth', 'out');

const missing = [setupExe, macDmg].filter(f => !fs.existsSync(path.join(releaseDir, f)));
if (missing.length) {
    console.error('見つかりません:', missing.join(', '));
    console.error(`以下を実行してください:\n  gh release download v${ver} -R reverinudog/takusaba-builder -D release --pattern '*.exe' --pattern '*.dmg'`);
    process.exit(1);
}

// readme -> UTF-8 BOM + CRLF copy
const readmeText = fs.readFileSync(readmeSrc, 'utf-8').replace(/\r?\n/g, '\r\n');
const readmeOut = 'はじめにお読みください.txt';

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const zipFolder = (files, zipPath) => {
    // Stage files in a temp dir so the zip entries are flat and the
    // archive itself gets an ASCII temp name (renamed afterwards).
    const tmp = fs.mkdtempSync(path.join(outDir, '.stage-'));
    for (const { src, name } of files) fs.copyFileSync(src, path.join(tmp, name));
    const tmpZip = zipPath + '.tmp.zip';
    if (process.platform === 'win32') {
        execFileSync('powershell', ['-NoProfile', '-Command',
            `Compress-Archive -Path '${tmp}\\*' -DestinationPath '${tmpZip}' -Force`]);
    } else {
        execFileSync('zip', ['-r', '-j', tmpZip, '.'], { cwd: tmp });
    }
    fs.renameSync(tmpZip, zipPath);
    fs.rmSync(tmp, { recursive: true, force: true });
};

const jobs = [
    {
        zip: `卓鯖ビルダー_v${ver}_Windows.zip`,
        files: [
            { src: path.join(releaseDir, setupExe), name: setupExe },
            { src: licenseSrc, name: 'LICENSE' }
        ]
    },
    {
        zip: `卓鯖ビルダー_v${ver}_Mac.zip`,
        files: [
            { src: path.join(releaseDir, macDmg), name: macDmg },
            { src: licenseSrc, name: 'LICENSE' }
        ]
    }
];

// readme is generated per-zip into the staging dir
for (const job of jobs) {
    const readmeTmp = path.join(outDir, `.readme-${job.zip}.tmp`);
    fs.writeFileSync(readmeTmp, '﻿' + readmeText, 'utf-8'); // BOM + CRLF for Windows Notepad
    job.files.push({ src: readmeTmp, name: readmeOut });
    const zipPath = path.join(outDir, job.zip);
    zipFolder(job.files, zipPath);
    fs.rmSync(readmeTmp);
    const size = fs.statSync(zipPath).size;
    console.log(`${job.zip}  ${(size / 1024 / 1024).toFixed(1)} MB (${size} bytes)`);
}

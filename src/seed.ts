import fs from 'fs';
import { PRESETS_FILE } from './paths';

const SAMPLE_PRESETS = [
    {
        presetId: 'sample-basic-trpg',
        presetName: 'サンプル：基本の卓',
        channels: [
            { key: 'c-overview', name: '概要', type: 'text' },
            { key: 'c-schedule', name: '日程調整', type: 'text' },
            { key: 'c-chat', name: '雑談', type: 'text' },
            { key: 'c-charsheet', name: 'キャラシ提出', type: 'text' },
            { key: 'c-gm', name: 'gm用メモ', type: 'text', isHidden: true },
            { key: 'c-voice', name: 'セッション部屋', type: 'voice' }
        ],
        posts: [
            {
                targetChannelKey: 'c-overview',
                items: [
                    { type: 'text', content: 'ようこそ！このカテゴリは今回の卓専用です。\n\n【シナリオ】（ここにシナリオ名）\n【システム】（ここにシステム名）\n【日程】日程調整チャンネルで決めます\n\n質問は雑談チャンネルへどうぞ。' }
                ]
            },
            {
                targetChannelKey: 'c-schedule',
                items: [
                    { type: 'text', content: '参加できる日時を書き込んでください。全員の都合が合う日をGMが確定します。' }
                ]
            },
            {
                targetChannelKey: 'c-charsheet',
                items: [
                    { type: 'text', content: 'キャラクターシートのURLまたは画像をここに投稿してください。' }
                ]
            }
        ]
    }
];

// Writes the sample preset only when no presets file exists yet —
// never touches an existing user file.
export const ensureSeedPresets = () => {
    if (fs.existsSync(PRESETS_FILE)) return;
    fs.writeFileSync(PRESETS_FILE, JSON.stringify(SAMPLE_PRESETS, null, 2), 'utf-8');
};

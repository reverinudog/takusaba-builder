import fs from 'fs';
import { PRESETS_FILE } from './paths';

type SeedChannel = { key: string; name: string; type: 'text' | 'voice'; isHidden?: boolean };
type SeedPost = { targetChannelKey: string; items: { type: 'text'; content: string }[] };
type SeedPreset = { presetId: string; presetName: string; channels: SeedChannel[]; posts: SeedPost[] };

const sample = (
    name: string,
    [overview, schedule, chat, charsheet, gm, voice]: string[],
    [postOverview, postSchedule, postCharsheet]: string[]
): SeedPreset => ({
    presetId: 'sample-basic-trpg',
    presetName: name,
    channels: [
        { key: 'c-overview', name: overview, type: 'text' },
        { key: 'c-schedule', name: schedule, type: 'text' },
        { key: 'c-chat', name: chat, type: 'text' },
        { key: 'c-charsheet', name: charsheet, type: 'text' },
        { key: 'c-gm', name: gm, type: 'text', isHidden: true },
        { key: 'c-voice', name: voice, type: 'voice' }
    ],
    posts: [
        { targetChannelKey: 'c-overview', items: [{ type: 'text', content: postOverview }] },
        { targetChannelKey: 'c-schedule', items: [{ type: 'text', content: postSchedule }] },
        { targetChannelKey: 'c-charsheet', items: [{ type: 'text', content: postCharsheet }] }
    ]
});

const SAMPLES: Record<string, SeedPreset> = {
    ja: sample(
        'サンプル：基本の卓',
        ['概要', '日程調整', '雑談', 'キャラシ提出', 'gm用メモ', 'セッション部屋'],
        [
            'ようこそ！このカテゴリは今回の卓専用です。\n\n【シナリオ】（ここにシナリオ名）\n【システム】（ここにシステム名）\n【日程】日程調整チャンネルで決めます\n\n質問は雑談チャンネルへどうぞ。',
            '参加できる日時を書き込んでください。全員の都合が合う日をGMが確定します。',
            'キャラクターシートのURLまたは画像をここに投稿してください。'
        ]
    ),
    en: sample(
        'Sample: Basic session',
        ['overview', 'scheduling', 'chat', 'character-sheets', 'gm-notes', 'session-voice'],
        [
            'Welcome! This category is dedicated to this session.\n\n[Scenario] (scenario name here)\n[System] (system name here)\n[Schedule] decided in the scheduling channel\n\nQuestions go to the chat channel.',
            'Please post the dates and times you can attend. The GM will confirm the day that works for everyone.',
            'Please post your character sheet URL or image here.'
        ]
    ),
    ko: sample(
        '샘플: 기본 세션',
        ['개요', '일정-조율', '잡담', '캐릭터-시트-제출', 'gm-메모', '세션-음성방'],
        [
            '환영합니다! 이 카테고리는 이번 세션 전용입니다.\n\n[시나리오] (여기에 시나리오 이름)\n[시스템] (여기에 시스템 이름)\n[일정] 일정 조율 채널에서 정합니다\n\n질문은 잡담 채널로 해 주세요.',
            '참가 가능한 날짜와 시간을 적어 주세요. 모두의 일정이 맞는 날을 GM이 확정합니다.',
            '캐릭터 시트의 URL 또는 이미지를 여기에 게시해 주세요.'
        ]
    ),
    'zh-Hans': sample(
        '示例：基础跑团',
        ['概况', '日程协调', '闲聊', '角色卡提交', 'gm笔记', '跑团语音房'],
        [
            '欢迎！本分类是本次跑团专用。\n\n【剧本】（在此填写剧本名）\n【规则】（在此填写规则名）\n【日程】在日程协调频道决定\n\n有问题请到闲聊频道。',
            '请写下你能参加的时间。GM 会确定大家都方便的日期。',
            '请把你的角色卡链接或图片发到这里。'
        ]
    ),
    'zh-Hant': sample(
        '範例：基本跑團',
        ['概況', '日程協調', '閒聊', '角色卡提交', 'gm筆記', '跑團語音房'],
        [
            '歡迎！本分類是本次跑團專用。\n\n【劇本】（在此填寫劇本名）\n【規則】（在此填寫規則名）\n【日程】在日程協調頻道決定\n\n有問題請到閒聊頻道。',
            '請寫下你能參加的時間。GM 會確定大家都方便的日期。',
            '請把你的角色卡連結或圖片發到這裡。'
        ]
    )
};

// Returns true when presets.json is missing or holds an empty array —
// the only states where seeding is allowed.
const isEmptyPresets = (): boolean => {
    if (!fs.existsSync(PRESETS_FILE)) return true;
    try {
        const raw = JSON.parse(fs.readFileSync(PRESETS_FILE, 'utf-8'));
        return Array.isArray(raw) && raw.length === 0;
    } catch {
        return false;
    }
};

// Writes the sample preset for `lang` only when there are no presets yet —
// never overwrites existing user data. Returns 'written' | 'skipped'.
export const ensureSeedPresets = (lang: string = 'ja'): 'written' | 'skipped' => {
    if (!isEmptyPresets()) return 'skipped';
    const preset = SAMPLES[lang] ?? SAMPLES.en;
    fs.writeFileSync(PRESETS_FILE, JSON.stringify([preset], null, 2), 'utf-8');
    return 'written';
};

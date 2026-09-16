export const MANAGE_CHANNELS = 1n << 4n;
export const MANAGE_ROLES = 1n << 28n;
export const VIEW_CHANNEL = 1n << 10n;
export const SEND_MESSAGES = 1n << 11n;
export const ATTACH_FILES = 1n << 15n;
export const READ_MESSAGE_HISTORY = 1n << 16n;
export const ADMINISTRATOR = 1n << 3n;

export const BOT_INVITE_PERMISSIONS =
    MANAGE_CHANNELS | MANAGE_ROLES | VIEW_CHANNEL | SEND_MESSAGES | ATTACH_FILES | READ_MESSAGE_HISTORY;

export const PERMISSION_NAMES: { bit: bigint; name: string }[] = [
    { bit: MANAGE_CHANNELS, name: 'チャンネルの管理' },
    { bit: MANAGE_ROLES, name: 'ロールの管理' },
    { bit: VIEW_CHANNEL, name: 'チャンネルを見る' },
    { bit: SEND_MESSAGES, name: 'メッセージを送信' },
    { bit: ATTACH_FILES, name: 'ファイルを添付' },
    { bit: READ_MESSAGE_HISTORY, name: 'メッセージ履歴を読む' }
];

export const APPLICATION_FLAG_GUILD_MEMBERS = (1n << 14n) | (1n << 15n);

export const hasGuildMembersIntent = (flags: bigint | number): boolean =>
    (BigInt(flags) & APPLICATION_FLAG_GUILD_MEMBERS) !== 0n;

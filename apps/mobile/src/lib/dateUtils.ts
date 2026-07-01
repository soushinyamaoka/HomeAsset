// 日付ユーティリティ（'YYYY-MM-DD' 文字列を常にローカル日付として扱う）

// 今日の日付をローカルタイムで 'YYYY-MM-DD' に
export function todayStr(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// 'YYYY-MM-DD' までの残日数（負なら経過済み）。
// new Date('YYYY-MM-DD') の UTC 解釈を避けるため数値分解して計算する。
export function daysUntil(dateStr: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
  if (!m) return NaN;
  const target = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

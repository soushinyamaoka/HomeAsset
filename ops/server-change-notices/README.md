# サーバ変更通知（server-change-notices）

VPS の構成・運用・利用者に影響する変更を行ったときに、通知をここへ作成する。

## ファイル名

`YYYYMMDD-APP-NNN-summary.md`

- `YYYYMMDD` … 作成日
- `APP` … `HOMEASSET`（このリポジトリ固定）
- `NNN` … このディレクトリ内の3桁連番（`001` から）

例: `20260828-HOMEASSET-001-summary.md`

## 運用

- `server_impact` が `notify` / `approval_required` のときに作成する。影響が不明なときは `none` にせず `notify` とする。
- **通知の作成は production 変更の承認ではない。** 通知を書いてもデプロイはしない。
- 雛形と通知ポリシーの正本は VPS管理プロジェクト側にある。所在は `work/ai_handoff/AI_INSTRUCTIONS.md` を参照する（別プロジェクトなので読むだけで編集しない）。

判断基準は `CLAUDE.md` の「VPS運用影響の報告（必須）」を正とする。

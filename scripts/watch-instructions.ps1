<#
.SYNOPSIS
  外部AIから配布される指示書(.md)を監視し、検知したら claude -p をヘッドレス起動して自動開発させる。

.DESCRIPTION
  - FileSystemWatcher で $WatchDir を常時監視し、新規 .md ファイルを検知する。
  - 検知したら scripts/watch-instructions.prompt.md をテンプレートにプロンプトを組み立て、
    claude -p（非対話モード）へ標準入力で渡す。
  - 処理はロックファイルで直列化し、多重起動・多重実行を防ぐ。
  - 開始・終了・エラーは watch.log に記録する。
  - 監視ループ自体は Claude を使わないため、トークンは「検知した時だけ」消費する。

  状態ファイルの置き場所（すべて .gitignore 済みの .run 配下）:
    .run/ai-watch/watch.log        … 監視ログ
    .run/ai-watch/watch.lock       … 監視プロセスの多重起動防止ロック
    .run/ai-watch/job.lock         … Claude 実行中を示すロック
    .run/ai-watch/processed.txt    … 処理済み指示書のハッシュ（同じ内容の再実行を防ぐ）
    .run/ai-watch/runs/            … 実行ごとの Claude 出力ログと result.md のコピー
    .run/ai-watch/tmp/             … claude へ渡すプロンプトの一時ファイル

  ChatGPT との受け渡し規約（work/ai_handoff/inbox/task.md → outbox/result.md）に合わせてあり、
  task.md は編集・移動しない。上書き（Changed）でも検知するため、同一内容の再実行は
  ハッシュで抑止する（再実行したい場合は processed.txt の該当行を消す）。

.PARAMETER Once
  1件処理したら監視を終了する（動作テスト用）。

.PARAMETER DryRun
  claude を起動せず、組み立てたプロンプトをログへ保存するだけにする（トークン消費なし）。

.PARAMETER ProcessExisting
  起動時点で監視フォルダにすでに存在する .md も処理対象にする（通常は新規ファイルのみ）。

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\watch-instructions.ps1
  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\watch-instructions.ps1 -DryRun -Once
#>
param(
  [switch]$Once,
  [switch]$DryRun,
  [switch]$ProcessExisting
)

$ErrorActionPreference = 'Stop'

# ============================================================
#  設定（環境に合わせて書き換える）
# ============================================================

# Claude の作業対象プロジェクト（= claude の作業ディレクトリ。CLAUDE.md はここから自動で読まれる）
$ProjectRoot = Split-Path -Parent $PSScriptRoot

# 監視対象フォルダ（★AI受け渡し規約の inbox。別フォルダで運用するならここを書き換える）
$WatchDir = Join-Path $ProjectRoot 'work\ai_handoff\inbox'

# 作業結果レポートの出力先（規約どおり outbox/result.md 固定。履歴は runs\ にコピーされる）
$OutboxDir      = Join-Path $ProjectRoot 'work\ai_handoff\outbox'
$ResultFileName = 'result.md'

# 処理済み指示書の退避
#   規約上 task.md は編集・移動してはならないため既定は $false（同じ内容の再処理はハッシュで抑止する）。
#   使い捨ての指示書ファイルを毎回流し込む運用にする場合のみ $true にする。
$ArchiveProcessed = $false
$ArchiveDir       = Join-Path $ProjectRoot 'work\ai_handoff\processed'

# production（VPS）への自動デプロイ方針
#   $true  … task.md の作業範囲・完了条件にデプロイ/production反映が含まれる場合「のみ」デプロイする
#   $false … 常にデプロイせず、commit/push まででユーザー承認待ち（result.md に blocked を記録）
$AutoDeploy = $true

# claude へ渡すモデル（'opus' / 'sonnet' / '' なら既定）
$ClaudeModel = ''

# 1件あたりの最大実行時間（超えたら強制終了して ERROR ログを残す）
$TimeoutMinutes = 30

# 権限設定：ヘッドレスでは「許可されていないツール」は自動的に拒否される。
#   acceptEdits       … ファイル編集は自動許可、コマンドは $AllowedTools のみ許可（推奨）
#   bypassPermissions … 全許可（危険。使う場合は自己責任で）
$PermissionMode = 'acceptEdits'

# 実行を許可するツール（カンマ区切りで claude へ渡すため、要素内に空白を含めないこと）
$AllowedTools = @(
  'Edit', 'Write',
  'Bash(git:*)',        # add / commit / push / status / diff
  'Bash(npm:*)',        # ビルド・検証・npm run deploy
  'Bash(npx:*)',        # tsc --noEmit など
  'Bash(node:*)',
  'Bash(powershell:*)'
)

# 明示的に禁止するツール（判断ルールの「外部通信・破壊的操作が必要なら中断」に対応）
$DisallowedTools = @(
  'WebFetch', 'WebSearch',
  'Bash(rm:*)', 'Bash(del:*)', 'Bash(curl:*)', 'Bash(wget:*)',
  'Bash(ssh:*)', 'Bash(scp:*)'
)

# 追加で claude へ渡したい引数があればここに（例: @('--effort','high')）
$ClaudeExtraArgs = @()

# ============================================================
#  ここから下は通常編集不要
# ============================================================

$PromptTemplateFile = Join-Path $PSScriptRoot 'watch-instructions.prompt.md'
$StateDir    = Join-Path $ProjectRoot '.run\ai-watch'
$RunsDir     = Join-Path $StateDir 'runs'
$TmpDir      = Join-Path $StateDir 'tmp'
$LogFile     = Join-Path $StateDir 'watch.log'
$LockFile    = Join-Path $StateDir 'watch.lock'
$JobLockFile = Join-Path $StateDir 'job.lock'
$HashFile    = Join-Path $StateDir 'processed.txt'

try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

function Ensure-Dir {
  param([string]$Path)
  if ($Path -and -not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path -Force | Out-Null
  }
}

function Write-Log {
  param(
    [string]$Message,
    [ValidateSet('INFO', 'WARN', 'ERROR')]
    [string]$Level = 'INFO'
  )
  $line = '[{0}] [{1}] {2}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Level, $Message
  switch ($Level) {
    'ERROR' { Write-Host $line -ForegroundColor Red }
    'WARN'  { Write-Host $line -ForegroundColor Yellow }
    default { Write-Host $line }
  }
  try { Add-Content -LiteralPath $LogFile -Value $line -Encoding utf8 } catch { }
}

function Test-ProcessAlive {
  param([int]$TargetPid)
  if ($TargetPid -le 0) { return $false }
  try {
    $null = Get-Process -Id $TargetPid -ErrorAction Stop
    return $true
  } catch {
    return $false
  }
}

function Enter-LockFile {
  param([string]$Path, [string]$Note = '')
  if (Test-Path -LiteralPath $Path) {
    $owner = 0
    try {
      $raw = Get-Content -LiteralPath $Path -Raw -ErrorAction Stop
      if ($raw -match '^\s*(\d+)') { $owner = [int]$Matches[1] }
    } catch { }
    if ($owner -gt 0 -and $owner -ne $PID -and (Test-ProcessAlive $owner)) {
      return $false
    }
    Write-Log ('残存ロックを破棄します: {0} (pid={1})' -f (Split-Path -Leaf $Path), $owner) 'WARN'
    Remove-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
  }
  Set-Content -LiteralPath $Path -Value ('{0} {1} {2}' -f $PID, (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Note) -Encoding utf8
  return $true
}

function Exit-LockFile {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return }
  $owner = 0
  try {
    $raw = Get-Content -LiteralPath $Path -Raw -ErrorAction Stop
    if ($raw -match '^\s*(\d+)') { $owner = [int]$Matches[1] }
  } catch { }
  if ($owner -eq 0 -or $owner -eq $PID) {
    Remove-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue
  }
}

# コピー完了前に検知することがあるため、サイズが安定するまで待つ
function Wait-FileReady {
  param([string]$Path, [int]$TimeoutSec = 60)
  $deadline = (Get-Date).AddSeconds($TimeoutSec)
  $lastSize = -1
  while ((Get-Date) -lt $deadline) {
    if (-not (Test-Path -LiteralPath $Path)) { Start-Sleep -Milliseconds 300; continue }
    try {
      $fs = [System.IO.File]::Open($Path, 'Open', 'Read', 'None')
      $size = $fs.Length
      $fs.Close()
      if ($size -gt 0 -and $size -eq $lastSize) { return $true }
      $lastSize = $size
    } catch {
      # 書き込み中はロックされるためリトライ
    }
    Start-Sleep -Milliseconds 500
  }
  return $false
}

# 同じ内容の指示書を二重に処理しないためのハッシュ台帳
function Get-ContentHash {
  param([string]$Path)
  try { return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash } catch { return '' }
}

function Test-AlreadyProcessed {
  param([string]$Hash)
  if (-not $Hash) { return $false }
  if (-not (Test-Path -LiteralPath $HashFile)) { return $false }
  return [bool](Select-String -LiteralPath $HashFile -SimpleMatch -Pattern $Hash -Quiet)
}

function Register-Processed {
  param([string]$Hash, [string]$TaskId, [string]$Name)
  if (-not $Hash) { return }
  Add-Content -LiteralPath $HashFile -Value ('{0} {1} {2} {3}' -f $Hash, (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $TaskId, $Name) -Encoding utf8
  try {
    $lines = @(Get-Content -LiteralPath $HashFile)
    if ($lines.Count -gt 500) {
      Set-Content -LiteralPath $HashFile -Value ($lines | Select-Object -Last 500) -Encoding utf8
    }
  } catch { }
}

# 指示書の先頭から task_id を拾う（ログ・レポート用。見つからなくても処理は続行する）
function Get-TaskId {
  param([string]$Path)
  try {
    foreach ($line in (Get-Content -LiteralPath $Path -TotalCount 40 -Encoding UTF8)) {
      if ($line -match 'task[_\-]?id\s*[:：]\s*(.+?)\s*$') {
        return $Matches[1].Trim().Trim([char]34, [char]39, [char]96)
      }
    }
  } catch { }
  return ''
}

function New-PromptText {
  param([string]$InstructionPath, [string]$ResultPath, [string]$TaskId)
  $template = Get-Content -LiteralPath $PromptTemplateFile -Raw -Encoding UTF8
  $body     = Get-Content -LiteralPath $InstructionPath -Raw -Encoding UTF8

  $taskIdLabel = $TaskId
  if (-not $taskIdLabel) {
    $taskIdLabel = '（指示書から task_id を読み取れませんでした。result.md には unknown と書き、その旨も記録すること）'
  }

  if ($AutoDeploy) {
    $deployPolicy = 'デプロイ・VPSへの接続/確認/変更は、task.md に「明示的な指示と承認」がある場合のみ実行してよい。' +
      'task.md に明記が無い、または読み取れない場合は実行せず、commit/push までで止め、result.md の status を partial、' +
      'production変更の有無を「なし（デプロイ承認待ち）」として記録する。承認そのものが不足している場合は blocked とする。'
  } else {
    $deployPolicy = 'デプロイ・VPSへの接続/確認/変更は一律禁止。commit/push までで止め、デプロイが必要な場合は実行せず ' +
      'result.md の status を blocked とし、承認が必要である旨を記録する。'
  }

  $text = $template.Replace('{{PROJECT_ROOT}}', $ProjectRoot)
  $text = $text.Replace('{{INSTRUCTION_PATH}}', $InstructionPath)
  $text = $text.Replace('{{INSTRUCTION_NAME}}', [System.IO.Path]::GetFileName($InstructionPath))
  $text = $text.Replace('{{RESULT_PATH}}', $ResultPath)
  $text = $text.Replace('{{TASK_ID}}', $taskIdLabel)
  $text = $text.Replace('{{DEPLOY_POLICY}}', $deployPolicy)
  $text = $text.Replace('{{INSTRUCTION_BODY}}', $body)
  return $text
}

function Invoke-ClaudeRun {
  param([string]$PromptText, [string]$RunLogPath, [string]$Tag)

  $utf8NoBom  = New-Object System.Text.UTF8Encoding($false)
  $promptFile = Join-Path $TmpDir ('prompt-{0}.txt' -f $Tag)
  $outFile    = Join-Path $TmpDir ('stdout-{0}.txt' -f $Tag)
  $errFile    = Join-Path $TmpDir ('stderr-{0}.txt' -f $Tag)
  [System.IO.File]::WriteAllText($promptFile, $PromptText, $utf8NoBom)

  # プロンプトは長くなるためコマンドライン引数ではなく標準入力で渡す
  $claudeArgs = @('--print', '--output-format', 'text', '--permission-mode', $PermissionMode)
  if ($AllowedTools.Count -gt 0)    { $claudeArgs += @('--allowedTools', ($AllowedTools -join ',')) }
  if ($DisallowedTools.Count -gt 0) { $claudeArgs += @('--disallowedTools', ($DisallowedTools -join ',')) }
  if ($ClaudeModel)                 { $claudeArgs += @('--model', $ClaudeModel) }
  if ($ClaudeExtraArgs.Count -gt 0) { $claudeArgs += $ClaudeExtraArgs }

  $proc = Start-Process -FilePath $ClaudeExe -ArgumentList $claudeArgs -WorkingDirectory $ProjectRoot -NoNewWindow -PassThru -RedirectStandardInput $promptFile -RedirectStandardOutput $outFile -RedirectStandardError $errFile

  $timedOut = $false
  if (-not $proc.WaitForExit($TimeoutMinutes * 60 * 1000)) {
    $timedOut = $true
    try { & taskkill /PID $proc.Id /T /F | Out-Null } catch { }
    try { $proc.WaitForExit(10000) | Out-Null } catch { }
  }

  $stdout = ''
  $stderr = ''
  if (Test-Path -LiteralPath $outFile) { $stdout = (Get-Content -LiteralPath $outFile -Raw -Encoding UTF8) }
  if (Test-Path -LiteralPath $errFile) { $stderr = (Get-Content -LiteralPath $errFile -Raw -Encoding UTF8) }

  $sb = New-Object System.Text.StringBuilder
  [void]$sb.AppendLine('=== claude args ===')
  [void]$sb.AppendLine(($claudeArgs -join ' '))
  [void]$sb.AppendLine('=== prompt ===')
  [void]$sb.AppendLine($PromptText)
  [void]$sb.AppendLine('=== stdout ===')
  [void]$sb.AppendLine($stdout)
  if ($stderr) {
    [void]$sb.AppendLine('=== stderr ===')
    [void]$sb.AppendLine($stderr)
  }
  [System.IO.File]::WriteAllText($RunLogPath, $sb.ToString(), $utf8NoBom)

  Remove-Item -LiteralPath $promptFile, $outFile, $errFile -Force -ErrorAction SilentlyContinue

  $exitCode = -1
  try { $exitCode = $proc.ExitCode } catch { }

  # プロンプトで最終行に出力させている RESULT: 行を拾う（規約の status と同じ語彙）
  $verdict = 'UNKNOWN'
  if ($stdout) {
    $found = [regex]::Matches($stdout, '(?m)^\s*RESULT:\s*(SUCCESS|PARTIAL|BLOCKED|FAILED)\s*$')
    if ($found.Count -gt 0) { $verdict = $found[$found.Count - 1].Groups[1].Value }
  }

  return [pscustomobject]@{
    ExitCode = $exitCode
    TimedOut = $timedOut
    Verdict  = $verdict
    Stdout   = $stdout
    Stderr   = $stderr
  }
}

function Invoke-Instruction {
  param([string]$Path)

  $name = [System.IO.Path]::GetFileName($Path)
  $base = [System.IO.Path]::GetFileNameWithoutExtension($Path)
  $tag  = '{0}-{1}' -f (Get-Date -Format 'yyyyMMdd-HHmmss'), ($base -replace '[^\w\-]', '_')

  Write-Log ('検知: {0}' -f $name)

  if (-not (Wait-FileReady $Path)) {
    Write-Log ('ファイルを読み取れませんでした（書き込み未完了 または 削除済み）: {0}' -f $name) 'ERROR'
    return
  }

  # 上書き保存（Changed）でも検知するため、同じ内容の再実行はハッシュで抑止する
  $hash = Get-ContentHash $Path
  if (Test-AlreadyProcessed $hash) {
    Write-Log ('スキップ（同じ内容を処理済み）: {0}' -f $name)
    return
  }

  $taskId = Get-TaskId $Path
  if ($taskId) {
    Write-Log ('task_id = {0}' -f $taskId)
    $tag = '{0}-{1}' -f (Get-Date -Format 'yyyyMMdd-HHmmss'), ($taskId -replace '[^\w\-]', '_')
  } else {
    Write-Log ('指示書に task_id の記載が見つかりませんでした: {0}' -f $name) 'WARN'
  }

  if (-not (Enter-LockFile $JobLockFile $name)) {
    Write-Log ('別の処理が実行中のためスキップしました（ファイルは監視フォルダに残ります）: {0}' -f $name) 'WARN'
    return
  }

  try {
    $resultPath = Join-Path $OutboxDir $ResultFileName
    $runLogPath = Join-Path $RunsDir ('{0}.log' -f $tag)
    $prompt     = New-PromptText -InstructionPath $Path -ResultPath $resultPath -TaskId $taskId

    if ($DryRun) {
      [System.IO.File]::WriteAllText($runLogPath, $prompt, (New-Object System.Text.UTF8Encoding($false)))
      Write-Log ('[DryRun] claude は起動していません。生成したプロンプト: {0}' -f $runLogPath)
      return
    }

    # 起動前に台帳へ登録する（途中で落ちても同じ内容を自動で再実行しない = トークンの無駄打ち防止）
    Register-Processed -Hash $hash -TaskId $taskId -Name $name

    $modelLabel = '既定'
    if ($ClaudeModel) { $modelLabel = $ClaudeModel }
    Write-Log ('処理開始: {0} (timeout={1}分, model={2})' -f $name, $TimeoutMinutes, $modelLabel)

    $sw  = [System.Diagnostics.Stopwatch]::StartNew()
    $res = Invoke-ClaudeRun -PromptText $prompt -RunLogPath $runLogPath -Tag $tag
    $sw.Stop()
    $elapsed = [math]::Round($sw.Elapsed.TotalMinutes, 1)

    if ($res.TimedOut) {
      Write-Log ('タイムアウトのため強制終了しました（{0}分超過）: {1} / log={2}' -f $TimeoutMinutes, $name, $runLogPath) 'ERROR'
    } elseif ($res.ExitCode -ne 0) {
      $head = ''
      if ($res.Stderr) { $head = (($res.Stderr -split "`r?`n") | Select-Object -First 3) -join ' / ' }
      Write-Log ('claude が異常終了しました (exit={0}): {1} / {2} / log={3}' -f $res.ExitCode, $name, $head, $runLogPath) 'ERROR'
    } else {
      switch ($res.Verdict) {
        'SUCCESS' { Write-Log ('完了 [success] {0}（{1}分）/ result={2}' -f $name, $elapsed, $resultPath) }
        'PARTIAL' { Write-Log ('一部完了 [partial] 承認待ちの項目があります: {0}（{1}分）/ result={2}' -f $name, $elapsed, $resultPath) 'WARN' }
        'BLOCKED' { Write-Log ('中断 [blocked] 判断ルールに該当したため停止しました: {0}（{1}分）/ result={2} / log={3}' -f $name, $elapsed, $resultPath, $runLogPath) 'WARN' }
        'FAILED'  { Write-Log ('失敗 [failed] {0}（{1}分）/ result={2} / log={3}' -f $name, $elapsed, $resultPath, $runLogPath) 'ERROR' }
        default   { Write-Log ('処理終了（RESULT行が出力されませんでした）: {0}（{1}分）/ log={2}' -f $name, $elapsed, $runLogPath) 'WARN' }
      }
      if (Test-Path -LiteralPath $resultPath) {
        # result.md は毎回上書きされるため、履歴として runs\ にコピーしておく
        Copy-Item -LiteralPath $resultPath -Destination (Join-Path $RunsDir ('{0}.result.md' -f $tag)) -Force -ErrorAction SilentlyContinue
      } else {
        Write-Log ('結果レポートが作成されていません: {0}' -f $resultPath) 'WARN'
      }
    }

    if ($ArchiveProcessed -and (Test-Path -LiteralPath $Path)) {
      try {
        $dest = Join-Path $ArchiveDir ('{0}{1}' -f $tag, [System.IO.Path]::GetExtension($name))
        Move-Item -LiteralPath $Path -Destination $dest -Force
        Write-Log ('指示書を退避しました: {0}' -f $dest)
      } catch {
        Write-Log ('指示書の退避に失敗しました: {0} / {1}' -f $name, $_.Exception.Message) 'WARN'
      }
    }
  } catch {
    Write-Log ('処理中に例外が発生しました: {0} / {1}' -f $name, $_.Exception.Message) 'ERROR'
  } finally {
    Exit-LockFile $JobLockFile
  }
}

# ============================================================
#  起動前チェック
# ============================================================
Ensure-Dir $StateDir
Ensure-Dir $RunsDir
Ensure-Dir $TmpDir

if (-not (Test-Path -LiteralPath $PromptTemplateFile)) {
  throw ('プロンプトテンプレートが見つかりません: {0}' -f $PromptTemplateFile)
}
if (-not (Test-Path -LiteralPath $WatchDir)) {
  Ensure-Dir $WatchDir
  Write-Log ('監視フォルダが無かったため作成しました: {0}' -f $WatchDir) 'WARN'
}
if (-not (Test-Path -LiteralPath $ProjectRoot)) {
  throw ('プロジェクトルートが見つかりません: {0}' -f $ProjectRoot)
}
Ensure-Dir $OutboxDir
if ($ArchiveProcessed) { Ensure-Dir $ArchiveDir }

$claudeCmd = Get-Command claude -ErrorAction SilentlyContinue
if (-not $claudeCmd) { throw 'claude コマンドが見つかりません（PATH を確認してください）。' }
$ClaudeExe = $claudeCmd.Source

if (-not (Enter-LockFile $LockFile 'watcher')) {
  Write-Log ('監視スクリプトはすでに起動中です（{0}）。二重起動を中止しました。' -f $LockFile) 'ERROR'
  exit 1
}

# ============================================================
#  監視ループ
# ============================================================
$watcher = $null
try {
  $watcher = New-Object System.IO.FileSystemWatcher
  $watcher.Path                  = $WatchDir
  $watcher.Filter                = '*.md'
  $watcher.IncludeSubdirectories = $false
  $watcher.NotifyFilter          = [System.IO.NotifyFilters]::FileName -bor [System.IO.NotifyFilters]::LastWrite

  # task.md のように同名ファイルが上書きされる運用もあるため Changed も購読する
  # （Changed は連続発火するので、内容ハッシュで二重処理を防いでいる）
  Register-ObjectEvent -InputObject $watcher -EventName Created -SourceIdentifier 'AiWatch.Created' | Out-Null
  Register-ObjectEvent -InputObject $watcher -EventName Renamed -SourceIdentifier 'AiWatch.Renamed' | Out-Null
  Register-ObjectEvent -InputObject $watcher -EventName Changed -SourceIdentifier 'AiWatch.Changed' | Out-Null
  $watcher.EnableRaisingEvents = $true

  Write-Log '============================================================'
  Write-Log ('監視開始: {0}' -f $WatchDir)
  Write-Log ('  プロジェクト : {0}' -f $ProjectRoot)
  Write-Log ('  結果出力先   : {0}' -f (Join-Path $OutboxDir $ResultFileName))
  Write-Log ('  ログ         : {0}' -f $LogFile)
  if ($AutoDeploy) {
    Write-Log '  デプロイ     : task.md の作業範囲・完了条件に含まれる場合のみ実行'
  } else {
    Write-Log '  デプロイ     : 常に実行しない（commit/push まで）'
  }
  if ($ArchiveProcessed) { Write-Log ('  処理済み退避 : {0}' -f $ArchiveDir) }
  if ($DryRun) { Write-Log '  モード       : DryRun（claude は起動しません）' 'WARN' }
  if ($Once)   { Write-Log '  モード       : Once（1件処理したら終了）' 'WARN' }
  Write-Log '終了するには Ctrl+C を押してください。'

  $recent = @{}
  $stop   = $false

  if ($ProcessExisting) {
    foreach ($f in (Get-ChildItem -LiteralPath $WatchDir -Filter '*.md' -File | Sort-Object LastWriteTime)) {
      Write-Log ('既存ファイルを処理対象にします: {0}' -f $f.Name)
      $recent[$f.FullName] = Get-Date
      Invoke-Instruction $f.FullName
      if ($Once) { $stop = $true; break }
    }
  }

  while (-not $stop) {
    $events = @(Get-Event | Where-Object { $_.SourceIdentifier -like 'AiWatch.*' })
    foreach ($ev in $events) {
      $full = $ev.SourceEventArgs.FullPath
      Remove-Event -EventIdentifier $ev.EventIdentifier

      if (-not $full) { continue }
      if ([System.IO.Path]::GetExtension($full).ToLower() -ne '.md') { continue }

      $leaf = [System.IO.Path]::GetFileName($full)
      if ($leaf.StartsWith('_') -or $leaf.StartsWith('.') -or $leaf.StartsWith('~')) {
        Write-Log ('スキップ（一時ファイル / 除外プレフィックス）: {0}' -f $leaf)
        continue
      }
      if (-not (Test-Path -LiteralPath $full)) { continue }

      # 同一ファイルに対する連続イベントの重複排除
      if ($recent.ContainsKey($full) -and ((Get-Date) - $recent[$full]).TotalSeconds -lt 10) { continue }
      $recent[$full] = Get-Date

      Invoke-Instruction $full

      if ($Once) { $stop = $true; break }
    }
    if (-not $stop) { Start-Sleep -Milliseconds 500 }
  }
} catch {
  Write-Log ('監視ループが異常終了しました: {0}' -f $_.Exception.Message) 'ERROR'
  throw
} finally {
  if ($watcher) {
    $watcher.EnableRaisingEvents = $false
    $watcher.Dispose()
  }
  Unregister-Event -SourceIdentifier 'AiWatch.Created' -ErrorAction SilentlyContinue
  Unregister-Event -SourceIdentifier 'AiWatch.Renamed' -ErrorAction SilentlyContinue
  Unregister-Event -SourceIdentifier 'AiWatch.Changed' -ErrorAction SilentlyContinue
  Exit-LockFile $JobLockFile
  Exit-LockFile $LockFile
  Write-Log '監視を終了しました。'
}

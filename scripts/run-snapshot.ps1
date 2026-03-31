Param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Args
)

$root = Split-Path -Parent $PSScriptRoot
$homeRoot = Join-Path $root '.codex-home'
$configDir = Join-Path $homeRoot '.claude'

New-Item -ItemType Directory -Force $homeRoot, $configDir | Out-Null

if (-not $env:CLAUDE_CODE_GIT_BASH_PATH) {
  $gitBashCandidates = @(
    'D:\Program Files\Git\bin\bash.exe',
    'C:\Program Files\Git\bin\bash.exe',
    'C:\Program Files (x86)\Git\bin\bash.exe'
  )

  foreach ($candidate in $gitBashCandidates) {
    if (Test-Path $candidate) {
      $env:CLAUDE_CODE_GIT_BASH_PATH = $candidate
      break
    }
  }
}

$env:CLAUDE_CONFIG_DIR = $configDir
$env:HOME = $homeRoot
$env:USERPROFILE = $homeRoot
$env:USE_BUILTIN_RIPGREP = '0'
$env:CLAUDE_CODE_SKIP_PREFLIGHT = '1'

bun (Join-Path $root 'dist\cli.js') @Args

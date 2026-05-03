# تشغيل الـ API ببايثون النظام: py -3 أو python من PATH، أو .venv إن وُجد.
$ErrorActionPreference = 'Stop'
foreach ($k in @('PYTHONHOME', 'PYTHONEXECUTABLE', 'PYTHONPATH')) {
    Remove-Item "Env:$k" -ErrorAction SilentlyContinue
}

Set-Location $PSScriptRoot
$venvPy = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'

if (Test-Path $venvPy) {
    $python = $venvPy
}
elseif (Get-Command py -ErrorAction SilentlyContinue) {
    $python = 'py'
}
elseif (Get-Command python -ErrorAction SilentlyContinue) {
    $python = 'python'
}
else {
    Write-Error 'لم يُعثر على Python. ثبّت Python من python.org (Add to PATH) أو شغّل setup-venv.bat'
    exit 1
}

$req = Join-Path $PSScriptRoot 'api\requirements.txt'

if ($python -eq 'py') {
    Write-Host 'Using: py -3'
    & py -3 -c 'import uvicorn' 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host 'Installing dependencies...'
        & py -3 -m pip install -r $req
    }
    & py -3 -m uvicorn api.main:app --reload --host 127.0.0.1 --port 8000
}
elseif ($python -eq 'python') {
    Write-Host 'Using: python'
    & python -c 'import uvicorn' 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host 'Installing dependencies...'
        & python -m pip install -r $req
    }
    & python -m uvicorn api.main:app --reload --host 127.0.0.1 --port 8000
}
else {
    Write-Host "Using: $python"
    & $python -c 'import uvicorn' 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host 'Installing dependencies...'
        & $python -m pip install -r $req
    }
    & $python -m uvicorn api.main:app --reload --host 127.0.0.1 --port 8000
}

# Push backend/ to Hugging Face Space without files over HF's 10MB git limit.
# Large runtime artifacts are downloaded in Dockerfile from GitHub main.

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Backend = Join-Path $Root "backend"
$DeployDir = Join-Path $env:TEMP "rupeeread-hf-deploy"

Remove-Item -Recurse -Force $DeployDir -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $DeployDir | Out-Null

robocopy $Backend $DeployDir /E /XD venv .venv __pycache__ /XF bm25_index.pkl graph.json .env | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed with exit code $LASTEXITCODE" }

Push-Location $DeployDir
try {
    if (-not (Test-Path ".git")) { git init -b main | Out-Null }
    git add -A
    git commit -m "Deploy RupeeRead backend to Hugging Face Space." 2>$null
    if ($LASTEXITCODE -ne 0) {
        git commit --allow-empty -m "Deploy RupeeRead backend to Hugging Face Space."
    }
    git remote remove space 2>$null
    git remote add space https://huggingface.co/spaces/aksjsj/rupeeread-backend
    git push space main --force
}
finally {
    Pop-Location
}

Write-Host "HF Space push complete. Check https://huggingface.co/spaces/aksjsj/rupeeread-backend/logs"

# Quick Vercel Deployment Script
# Run this to prepare your project for Vercel deployment

Write-Host "🚀 Preparing project for Vercel deployment..." -ForegroundColor Cyan
Write-Host ""

# Check if git is initialized
if (-not (Test-Path ".git")) {
    Write-Host "📦 Initializing Git repository..." -ForegroundColor Yellow
    git init
    Write-Host "✅ Git initialized" -ForegroundColor Green
}
else {
    Write-Host "✅ Git already initialized" -ForegroundColor Green
}

# Check if .gitignore exists
if (-not (Test-Path ".gitignore")) {
    Write-Host "⚠️ No .gitignore found! Creating one..." -ForegroundColor Yellow
    @"
# Dependencies
node_modules/
/.pnp
.pnp.js

# Testing
/coverage

# Next.js
/.next/
/out/

# Production
/build

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env
.env*.local
.env.production

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts

# Docker
Dockerfile
docker-compose.yml
.dockerignore
"@ | Out-File -FilePath ".gitignore" -Encoding UTF8
    Write-Host "✅ .gitignore created" -ForegroundColor Green
}
else {
    Write-Host "✅ .gitignore exists" -ForegroundColor Green
}

# Check if .env is gitignored
$gitignoreContent = Get-Content ".gitignore" -Raw
if ($gitignoreContent -notmatch "\.env") {
    Write-Host "⚠️ Adding .env to .gitignore..." -ForegroundColor Yellow
    "`n# Environment variables`n.env`n.env*.local" | Out-File -FilePath ".gitignore" -Append -Encoding UTF8
    Write-Host "✅ .env added to .gitignore" -ForegroundColor Green
}

Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Get GitHub username
$username = Read-Host "Enter your GitHub username"

if ([string]::IsNullOrWhiteSpace($username)) {
    Write-Host ""
    Write-Host "⏭️ Skipping GitHub setup. You can do this manually later." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Manual steps:" -ForegroundColor Yellow
    Write-Host "1. Create repository on GitHub"
    Write-Host "2. Run: git remote add origin https://github.com/YOUR_USERNAME/simple-financial.git"
    Write-Host "3. Run: git add ."
    Write-Host "4. Run: git commit -m 'Initial commit'"
    Write-Host "5. Run: git branch -M main"
    Write-Host "6. Run: git push -u origin main"
}
else {
    $repoName = Read-Host "Enter repository name [simple-financial]"
    if ([string]::IsNullOrWhiteSpace($repoName)) { $repoName = "simple-financial" }
    
    Write-Host ""
    Write-Host "Setting up Git remote..." -ForegroundColor Yellow
    
    # Add all files
    git add .
    
    # Commit
    git commit -m "Initial commit for Vercel deployment"
    
    # Add remote
    $remoteUrl = "https://github.com/$username/$repoName.git"
    
    try {
        git remote add origin $remoteUrl 2>$null
    }
    catch {
        Write-Host "Remote already exists, updating..." -ForegroundColor Yellow
        git remote set-url origin $remoteUrl
    }
    
    # Set branch to main
    git branch -M main
    
    Write-Host ""
    Write-Host "✅ Git configuration complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📌 IMPORTANT: Before pushing to GitHub" -ForegroundColor Red
    Write-Host "================================" -ForegroundColor Red
    Write-Host "1. Create a new repository on GitHub: https://github.com/new" -ForegroundColor Yellow
    Write-Host "   - Repository name: $repoName" -ForegroundColor Yellow
    Write-Host "   - DO NOT initialize with README" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "2. Then run:" -ForegroundColor Yellow
    Write-Host "   git push -u origin main" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host ""
Write-Host "🌐 Next: Deploy to Vercel" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "1. Go to https://vercel.com/new" -ForegroundColor Yellow
Write-Host "2. Import your GitHub repository" -ForegroundColor Yellow
Write-Host "3. Add environment variables (see vercel-deployment.md)" -ForegroundColor Yellow
Write-Host "4. Click Deploy!" -ForegroundColor Yellow
Write-Host ""
Write-Host "💾 Database Setup Required" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Choose one:" -ForegroundColor Yellow
Write-Host "- Neon (recommended): https://neon.tech" -ForegroundColor Yellow
Write-Host "- Supabase: https://supabase.com" -ForegroundColor Yellow
Write-Host "- Vercel Postgres (paid): From Vercel dashboard" -ForegroundColor Yellow
Write-Host ""
Write-Host "📖 Full Guide: See vercel-deployment.md for detailed instructions" -ForegroundColor Cyan
Write-Host ""
Write-Host "✨ All set! Good luck with your deployment! 🚀" -ForegroundColor Green

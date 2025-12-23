# Telegram Bot Troubleshooting & Fix Script

Write-Host "🔍 Telegram Bot Diagnostics" -ForegroundColor Cyan
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check local .env
Write-Host "📋 Step 1: Checking local environment..." -ForegroundColor Yellow
if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    
    if ($envContent -match "TELEGRAM_BOT_TOKEN") {
        Write-Host "✅ TELEGRAM_BOT_TOKEN found in local .env" -ForegroundColor Green
        $localToken = ($envContent -split "`n" | Where-Object { $_ -match "TELEGRAM_BOT_TOKEN" }) -replace "TELEGRAM_BOT_TOKEN\s*=\s*", ""
        $tokenLength = $localToken.Trim().Length
        Write-Host "   Token length: $tokenLength characters" -ForegroundColor Gray
        
        if ($tokenLength -lt 40) {
            Write-Host "   ⚠️  WARNING: Token seems too short!" -ForegroundColor Red
        }
    }
    else {
        Write-Host "❌ TELEGRAM_BOT_TOKEN NOT found in local .env" -ForegroundColor Red
    }
    
    if ($envContent -match "APP_URL") {
        Write-Host "✅ APP_URL found in local .env" -ForegroundColor Green
    }
    else {
        Write-Host "❌ APP_URL NOT found in local .env" -ForegroundColor Red
    }
}
else {
    Write-Host "❌ .env file not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "📋 Step 2: Testing Bot Token..." -ForegroundColor Yellow

# Get token from .env if exists
$token = $null
if (Test-Path ".env") {
    $envLines = Get-Content ".env"
    foreach ($line in $envLines) {
        if ($line -match "^TELEGRAM_BOT_TOKEN\s*=\s*(.+)$") {
            $token = $Matches[1].Trim()
            break
        }
    }
}

if ($token) {
    Write-Host "Testing bot token with Telegram API..." -ForegroundColor Gray
    
    try {
        $response = Invoke-RestMethod -Uri "https://api.telegram.org/bot$token/getMe" -Method Get -ErrorAction Stop
        
        if ($response.ok) {
            Write-Host "✅ Bot token is VALID!" -ForegroundColor Green
            Write-Host "   Bot Username: @$($response.result.username)" -ForegroundColor Green
            Write-Host "   Bot Name: $($response.result.first_name)" -ForegroundColor Green
            Write-Host "   Bot ID: $($response.result.id)" -ForegroundColor Green
        }
        else {
            Write-Host "❌ Bot token is INVALID" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "❌ Failed to validate token: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "   This likely means the token is incorrect or expired" -ForegroundColor Red
    }
}
else {
    Write-Host "⚠️  No token found to test" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📋 Step 3: Check Vercel Configuration..." -ForegroundColor Yellow
Write-Host "⚠️  NOTE: You must manually verify these in Vercel Dashboard" -ForegroundColor Yellow
Write-Host ""
Write-Host "Go to: https://vercel.com/dashboard" -ForegroundColor Cyan
Write-Host "Then: Your Project → Settings → Environment Variables" -ForegroundColor Cyan
Write-Host ""
Write-Host "Required variables:" -ForegroundColor White
Write-Host "  ✓ TELEGRAM_BOT_TOKEN (Production, Preview, Development)" -ForegroundColor Gray
Write-Host "  ✓ APP_URL (Production only)" -ForegroundColor Gray
Write-Host ""

Write-Host "📋 Step 4: Solution Summary" -ForegroundColor Yellow
Write-Host "=============================" -ForegroundColor Cyan
Write-Host ""

if ($token) {
    Write-Host "✅ Action Plan:" -ForegroundColor Green
    Write-Host ""
    Write-Host "1. Copy this token to Vercel:" -ForegroundColor White
    Write-Host "   $token" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "2. Go to Vercel Dashboard:" -ForegroundColor White
    Write-Host "   https://vercel.com/dashboard" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "3. Add/Update Environment Variable:" -ForegroundColor White
    Write-Host "   Name: TELEGRAM_BOT_TOKEN" -ForegroundColor Cyan
    Write-Host "   Value: (paste the token above)" -ForegroundColor Cyan
    Write-Host "   Environments: All 3 (Production, Preview, Development)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "4. Add APP_URL if missing:" -ForegroundColor White
    Write-Host "   Name: APP_URL" -ForegroundColor Cyan
    Write-Host "   Value: https://simple-financial.vercel.app" -ForegroundColor Cyan
    Write-Host "   Environments: Production only" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "5. After adding, click Deployments → Redeploy" -ForegroundColor White
    Write-Host ""
    Write-Host "6. Wait 2-3 minutes, then test bot with /start" -ForegroundColor White
}
else {
    Write-Host "❌ No bot token found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Action Required:" -ForegroundColor Yellow
    Write-Host "1. Get your bot token from @BotFather on Telegram" -ForegroundColor White
    Write-Host "2. Send /mybots → Select your bot → API Token" -ForegroundColor White
    Write-Host "3. Copy the token (looks like: 1234567890:ABCdef...)" -ForegroundColor White
    Write-Host "4. Add to both .env (local) AND Vercel Dashboard" -ForegroundColor White
}

Write-Host ""
Write-Host "🔧 Common Issues & Fixes:" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Issue: Bot doesn't respond to /start" -ForegroundColor Yellow
Write-Host "Fix: Make sure you REDEPLOYED after adding token to Vercel" -ForegroundColor White
Write-Host ""
Write-Host "Issue: Still getting 401 Unauthorized" -ForegroundColor Yellow
Write-Host "Fix: Token might be wrong, get a fresh one from BotFather" -ForegroundColor White
Write-Host ""
Write-Host "Issue: 409 Conflict error" -ForegroundColor Yellow
Write-Host "Fix: Stop your local dev server (npm run dev)" -ForegroundColor White
Write-Host ""

Write-Host "✨ Done! Follow the action plan above." -ForegroundColor Green

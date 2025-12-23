# Production Environment Generator (PowerShell)
# This script helps generate secure environment variables for deployment

Write-Host "🔐 Production Environment Generator" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Function to generate random base64 string
function Get-RandomBase64 {
    param([int]$Length = 32)
    $bytes = New-Object byte[] $Length
    $rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
    $rng.GetBytes($bytes)
    return [Convert]::ToBase64String($bytes)
}

# Generate secrets
$JWT_SECRET = Get-RandomBase64 -Length 32
$DB_PASSWORD = Get-RandomBase64 -Length 24
$TG_SECRET = Get-RandomBase64 -Length 24

# Get user input
$DB_NAME = Read-Host "Enter your database name [nexusflow]"
if ([string]::IsNullOrWhiteSpace($DB_NAME)) { $DB_NAME = "nexusflow" }

$DB_USER = Read-Host "Enter your database user [postgres]"
if ([string]::IsNullOrWhiteSpace($DB_USER)) { $DB_USER = "postgres" }

$JWT_EXPIRES = Read-Host "Enter JWT expiration time [7d]"
if ([string]::IsNullOrWhiteSpace($JWT_EXPIRES)) { $JWT_EXPIRES = "7d" }

# Create .env file
$envContent = @"
# Database Configuration
POSTGRES_USER=$DB_USER
POSTGRES_PASSWORD=$DB_PASSWORD
POSTGRES_DB=$DB_NAME

# JWT Configuration
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=$JWT_EXPIRES

# Telegram Configuration
TG_WEBHOOK_SECRET=$TG_SECRET

# Application Configuration
NODE_ENV=production
PORT=8082
"@

$envContent | Out-File -FilePath ".env.production" -Encoding UTF8

Write-Host ""
Write-Host "✅ Generated .env.production file!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Your Production Environment Variables:" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Yellow
Write-Host $envContent
Write-Host ""
Write-Host "🔒 IMPORTANT: " -ForegroundColor Red
Write-Host "  1. Copy .env.production to .env on your server"
Write-Host "  2. NEVER commit .env files to git"
Write-Host "  3. Keep these secrets secure!"
Write-Host ""
Write-Host "📝 To use on server:" -ForegroundColor Cyan
Write-Host "  Copy-Item .env.production .env"
Write-Host ""
Write-Host "✅ Done! You can now use this file for deployment." -ForegroundColor Green

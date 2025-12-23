#!/bin/bash

# Production Environment Generator
# This script helps generate secure environment variables for deployment

echo "🔐 Production Environment Generator"
echo "===================================="
echo ""

# Generate secrets
JWT_SECRET=$(openssl rand -base64 32)
DB_PASSWORD=$(openssl rand -base64 24)
TG_SECRET=$(openssl rand -base64 24)

# Get user input
read -p "Enter your database name [nexusflow]: " DB_NAME
DB_NAME=${DB_NAME:-nexusflow}

read -p "Enter your database user [postgres]: " DB_USER
DB_USER=${DB_USER:-postgres}

read -p "Enter JWT expiration time [7d]: " JWT_EXPIRES
JWT_EXPIRES=${JWT_EXPIRES:-7d}

# Create .env file
cat > .env.production << EOF
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
EOF

echo ""
echo "✅ Generated .env.production file!"
echo ""
echo "📋 Your Production Environment Variables:"
echo "=========================================="
cat .env.production
echo ""
echo "🔒 IMPORTANT: "
echo "  1. Copy .env.production to .env on your server"
echo "  2. NEVER commit .env files to git"
echo "  3. Keep these secrets secure!"
echo ""
echo "📝 To use on server:"
echo "  cp .env.production .env"
echo ""

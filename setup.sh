#!/bin/bash
# Setup script for Simple Financial App

echo "Setting up Simple Financial App..."

# Create .env.local file
cat > .env.local << EOF
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/simple_financial
PGSSL=false

# JWT Configuration
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=7d

# Development settings
NODE_ENV=development
EOF

echo "✅ Created .env.local file"
echo "⚠️  Please update DATABASE_URL with your actual database credentials"
echo "⚠️  JWT_SECRET has been auto-generated - keep it secure!"

# Create a sample user creation script
cat > create-sample-user.js << 'EOF'
const { createUser } = require('./src/lib/users.ts');

async function createSampleUser() {
  try {
    const user = await createUser(
      'Project Manager',
      'project.manager@example.com',
      'password123'
    );
    console.log('✅ Sample user created:', user);
  } catch (error) {
    console.error('❌ Error creating user:', error);
  }
}

createSampleUser();
EOF

echo "✅ Created sample user creation script"
echo ""
echo "Next steps:"
echo "1. Update DATABASE_URL in .env.local with your actual database credentials"
echo "2. Run: npm run dev"
echo "3. Create a sample user by running the create-sample-user.js script"
echo "4. For Vercel deployment, add these environment variables in your Vercel dashboard"

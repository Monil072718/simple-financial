# Environment Variables Required for Vercel Deployment

## Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database
PGSSL=true

## JWT Configuration  
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
JWT_EXPIRES_IN=7d

## Production Settings
NODE_ENV=production

---

## How to Fix Your Vercel Deployment:

### 1. Add Environment Variables in Vercel Dashboard:
- Go to your Vercel project dashboard
- Navigate to Settings > Environment Variables
- Add the following variables:

**DATABASE_URL**: Your PostgreSQL connection string
- Format: `postgresql://username:password@host:port/database`
- For Vercel Postgres: Use the connection string from your Vercel Postgres database

**JWT_SECRET**: A secure random string (minimum 32 characters)
- Generate one using: `openssl rand -base64 32`

**PGSSL**: Set to `true` for production

### 2. Database Setup:
- If using Vercel Postgres, the database will be automatically created
- If using external PostgreSQL, ensure it's accessible from Vercel

### 3. Create Initial User:
You'll need to create at least one user in your database. You can do this by:
- Running a migration script
- Using a database admin tool
- Creating a temporary API endpoint for user creation

### 4. Common Issues:
- **Missing DATABASE_URL**: App can't connect to database
- **Missing JWT_SECRET**: Authentication will fail
- **No users in database**: Login will always fail
- **SSL issues**: Set PGSSL=true for production databases

### 5. Testing:
After setting up environment variables:
1. Redeploy your Vercel app
2. Test the `/api/health` endpoint
3. Try logging in with a valid user account

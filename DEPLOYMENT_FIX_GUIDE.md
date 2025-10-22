# Vercel Deployment Fix Guide

## Issues Found and Fixed

### 1. **Critical Schema Mismatch** ✅ FIXED
- **Problem**: `src/lib/migrate.ts` had old schema without `password_hash` column
- **Fix**: Updated migrate.ts to include `password_hash` column
- **Impact**: This was causing 500 errors on user registration/login

### 2. **JavaScript ReferenceError** ✅ FIXED  
- **Problem**: `created` variable undefined in nexusflow.html
- **Fix**: Moved code inside proper function scope

### 3. **Vercel Configuration** ✅ ADDED
- **Added**: `vercel.json` for proper routing configuration

## Deployment Steps

### 1. **Environment Variables** (Required in Vercel Dashboard)
Set these in your Vercel project settings:

```
DATABASE_URL=postgresql://username:password@host:port/database
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
PGSSL=true
NODE_ENV=production
```

### 2. **Database Setup**
- **For Vercel Postgres**: Database will be created automatically
- **For External PostgreSQL**: Ensure it's accessible from Vercel
- **Migration**: The schema will be created automatically on first API call

### 3. **Deploy to Vercel**
```bash
# Push your changes to GitHub
git add .
git commit -m "Fix deployment issues"
git push origin main

# Or deploy directly with Vercel CLI
vercel --prod
```

### 4. **Test Deployment**
1. **Health Check**: Visit `https://your-app.vercel.app/api/health`
2. **Database Check**: Visit `https://your-app.vercel.app/api/debug/db`
3. **Frontend**: Visit `https://your-app.vercel.app/` (should redirect to nexusflow.html)
4. **User Registration**: Try creating a new user
5. **User Login**: Try logging in with the created user

## Architecture Overview

Your app has a mixed architecture:
- **Frontend**: Static HTML/JS (`public/nexusflow.html`)
- **Backend**: Next.js API routes (`src/app/api/`)
- **Database**: PostgreSQL
- **Deployment**: Vercel

## File Structure
```
/
├── public/nexusflow.html          # Frontend (HTML/JS)
├── src/app/api/                  # Backend API routes
├── src/lib/                      # Backend utilities
├── vercel.json                   # Vercel configuration
└── migrate_add_password_hash.sql # Database migration
```

## Common Issues & Solutions

### Issue: 500 Error on User Registration/Login
- **Cause**: Missing `password_hash` column
- **Solution**: ✅ Fixed in migrate.ts

### Issue: JavaScript Console Errors
- **Cause**: Undefined variables
- **Solution**: ✅ Fixed scope issues

### Issue: API Routes Not Working
- **Cause**: Missing environment variables
- **Solution**: Set DATABASE_URL and JWT_SECRET in Vercel

### Issue: Frontend Not Loading
- **Cause**: Routing issues
- **Solution**: ✅ Added vercel.json configuration

## Testing Checklist

- [ ] Health endpoint returns 200
- [ ] Database debug endpoint shows tables
- [ ] Frontend loads without console errors
- [ ] User registration works
- [ ] User login works
- [ ] API calls from frontend succeed

## Next Steps After Deployment

1. **Create First User**: Register an admin user
2. **Test All Features**: Verify all functionality works
3. **Monitor Logs**: Check Vercel function logs for any issues
4. **Set Up Monitoring**: Consider adding error tracking

## Support

If you still face issues:
1. Check Vercel function logs
2. Verify environment variables are set
3. Test API endpoints individually
4. Check database connectivity

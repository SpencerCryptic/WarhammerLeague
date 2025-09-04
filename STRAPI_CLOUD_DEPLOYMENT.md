# Strapi Cloud Deployment Guide

This document outlines the steps and environment variables needed to deploy the Warhammer League application to Strapi Cloud.

## Required Environment Variables for Strapi Cloud

When setting up your Strapi Cloud project, you'll need to configure these environment variables:

### Core Authentication & Security Variables
These should be generated as strong, random strings:

```
APP_KEYS=generate-4-random-keys-separated-by-commas
API_TOKEN_SALT=generate-random-string
ADMIN_JWT_SECRET=generate-random-string  
TRANSFER_TOKEN_SALT=generate-random-string
JWT_SECRET=generate-random-string
```

**Important**: Generate strong, unique values for each environment. You can use online generators or Node.js crypto:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

### Database Configuration
Strapi Cloud will automatically provide PostgreSQL database environment variables. No manual configuration needed.

### Optional Email Configuration (if needed)
If you want to enable email notifications:

```
EMAIL_PROVIDER=nodemailer
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USERNAME=your-email@gmail.com
EMAIL_SMTP_PASSWORD=your-app-password
```

## Frontend Configuration

After your Strapi Cloud backend is deployed, update the frontend environment variable:

```
NEXT_PUBLIC_API_URL=https://your-project-name.strapi.app
```

## Deployment Steps

1. **Push code to main branch** ✅ (Completed)
   ```bash
   git checkout main
   git push origin main
   ```

2. **Create Strapi Cloud Project**
   - Go to https://cloud.strapi.io
   - Connect your GitHub repository (SpencerCryptic/WarhammerLeague)
   - Select the main branch
   - Choose Europe (West) region for better performance

3. **Configure Environment Variables in Strapi Cloud**
   - Add all the core authentication variables listed above
   - Generate strong, unique values for each

4. **Deploy and Test**
   - Strapi Cloud will build and deploy automatically
   - Test the admin panel access
   - Verify API endpoints are working

5. **Update Frontend**
   - Update frontend .env with new Strapi Cloud URL
   - Deploy frontend to your hosting platform (Vercel, Netlify, etc.)

## Project Structure

- **Backend**: Node.js 20.x, Strapi 5.x
- **Database**: Better SQLite3 (local) → PostgreSQL (production)
- **Custom APIs**: Profile management system
- **Extensions**: User permissions with custom routes

## Key Features Deployed

- ✅ User registration with profile data
- ✅ Field-restricted profile updates (email, phone, store location)
- ✅ League management system
- ✅ Match tracking
- ✅ Store events integration (Mahina API)
- ✅ Role-based access control

## Post-Deployment Tasks

1. Create admin user in Strapi Cloud admin panel
2. Configure user permissions for authenticated users
3. Test registration and login flows
4. Verify profile update restrictions are working
5. Test league creation and management

## Troubleshooting

- **Build failures**: Check Node.js version compatibility (18-22.x required)
- **Database issues**: Strapi Cloud handles PostgreSQL automatically
- **API errors**: Verify environment variables are set correctly
- **CORS issues**: Frontend domain may need to be whitelisted in Strapi settings
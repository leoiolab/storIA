# StorIA Cloud Deployment Guide

This guide covers deploying StorIA to the cloud using Vercel (frontend) + Railway (backend).

## 🚀 Quick Deploy to Vercel

### Prerequisites
- GitHub account
- Vercel account (free at vercel.com)
- Railway account (free at railway.app)

### Frontend Deployment (Vercel)

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Configure:
     - **Framework Preset:** Vite
     - **Build Command:** `npm run build:web`
     - **Output Directory:** `dist`
     - **Install Command:** `npm install`

3. **Environment Variables:**
   Add these in Vercel dashboard:
   ```
   VITE_API_URL=https://your-railway-backend.railway.app
   VITE_APP_NAME=StorIA
   ```

### Backend Deployment (Railway)

1. **Prepare Backend:**
   ```bash
   cd server
   npm install
   ```

2. **Deploy to Railway:**
   - Go to [railway.app](https://railway.app)
   - Click "New Project"
   - Connect GitHub repository
   - Select the `server` folder
   - Add environment variables:
     ```
     MONGODB_URI=mongodb://localhost:27017/storia
     JWT_SECRET=your-secret-key
     PORT=3000
     ```

3. **Add MongoDB:**
   - In Railway dashboard, click "New"
   - Select "MongoDB"
   - Copy the connection string to `MONGODB_URI`

### Testing the Deployment

1. **Frontend:** Visit your Vercel URL
2. **Backend:** Test API endpoints
3. **Integration:** Verify frontend can connect to backend

## 🔧 Local Development

### Web Version (for testing)
```bash
npm run dev:web
```

### Electron Version (desktop)
```bash
npm run dev
```

## 📁 Project Structure

```
storia/
├── src/                    # React frontend
├── server/                 # Node.js backend
├── dist/                   # Built frontend (for Vercel)
├── vercel.json            # Vercel configuration
├── vite.config.web.ts     # Web-specific Vite config
└── index-web.html         # Web-specific HTML
```

## 🌐 Environment Variables

### Frontend (Vercel)
- `VITE_API_URL` - Backend API URL
- `VITE_APP_NAME` - App name

### Backend (Railway)
- `MONGODB_URI` - Database connection
- `JWT_SECRET` - JWT signing secret
- `PORT` - Server port (Railway sets this)

## 🚨 Troubleshooting

**Build fails on Vercel?**
- Check build command: `npm run build:web`
- Verify all dependencies in package.json
- Check Vite config for web deployment

**Backend not connecting?**
- Verify Railway environment variables
- Check MongoDB connection string
- Ensure CORS is configured for frontend domain

**CORS errors?**
- Add frontend domain to backend CORS settings
- Check API URL in frontend environment variables

## 📊 Monitoring

- **Vercel:** Check deployment logs in dashboard
- **Railway:** Monitor logs and metrics
- **MongoDB:** Use Railway's database dashboard

## 🔄 Updates

To update the deployment:
1. Push changes to GitHub
2. Vercel auto-deploys frontend
3. Railway auto-deploys backend
4. Test the live application

---

**Need help?** Check the logs in Vercel/Railway dashboards for detailed error messages.

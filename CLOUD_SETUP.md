# Authorio Cloud Setup Guide

This guide explains how to set up Authorio with cloud-based data storage while keeping the desktop application for macOS and Windows.

## Architecture

- **Frontend**: Electron desktop app (macOS/Windows/Linux)
- **Backend**: Node.js/Express REST API
- **Database**: MongoDB (cloud or self-hosted)
- **Authentication**: JWT-based user authentication

## Prerequisites

- Node.js v18 or higher
- MongoDB (local or cloud instance like MongoDB Atlas)
- npm or yarn

## Quick Start (Development)

### 1. Set Up MongoDB

**Option A: Local MongoDB**
```bash
# Install MongoDB (macOS)
brew install mongodb-community
brew services start mongodb-community

# Install MongoDB (Ubuntu/Debian)
sudo apt-get install mongodb
sudo systemctl start mongodb
```

**Option B: MongoDB Atlas (Cloud)**
1. Create account at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a free cluster
3. Get your connection string (looks like `mongodb+srv://...`)

### 2. Set Up Backend Server

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env file with your settings
nano .env
```

Configure your `.env` file:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/authorio  # or your Atlas connection string
JWT_SECRET=your-super-secret-key-min-32-characters-long
CLIENT_URL=http://localhost:3000
JWT_EXPIRES_IN=7d
```

**Important**: Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Start Backend Server

```bash
# Development mode (with auto-reload)
cd server
npm run dev

# Production mode
npm run build
npm start
```

Server will start on `http://localhost:5000`

### 4. Configure Frontend

Create `.env` file in the root directory:
```env
VITE_API_URL=http://localhost:5000/api
```

### 5. Start Desktop App

```bash
# From root directory
npm install
npm run build:electron
npm run dev
```

The Electron app will launch and show the login/register screen.

## Cloud Deployment

### Option 1: Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Option 2: Deploy to Cloud Platforms

#### Deploy Backend to Railway/Render/Heroku

1. **Create account** on your chosen platform
2. **Create new project** from Git repository
3. **Set environment variables**:
   - `MONGODB_URI` - your MongoDB connection string
   - `JWT_SECRET` - generate a secure key
   - `CLIENT_URL` - will be set after frontend deployment
   - `PORT` - usually auto-set by platform

4. **Deploy**:
   - Railway/Render: Auto-deploys on git push
   - Heroku: `git push heroku main`

#### Deploy Frontend (Electron App)

The Electron app connects to your cloud backend:

1. Update `.env`:
```env
VITE_API_URL=https://your-backend-url.com/api
```

2. Build desktop app:
```bash
npm run build
npm run package
```

3. Distribute the app:
   - macOS: `out/Authorio-1.0.0.dmg`
   - Windows: `out/Authorio Setup 1.0.0.exe`

### Option 3: VPS Deployment (DigitalOcean, AWS, etc.)

```bash
# SSH into your server
ssh user@your-server-ip

# Install Node.js and MongoDB
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs mongodb

# Clone repository
git clone https://github.com/yourusername/authorio.git
cd authorio

# Set up backend
cd server
npm install
cp .env.example .env
nano .env  # Configure your settings

# Build and start with PM2
npm run build
npm install -g pm2
pm2 start dist/index.js --name authorio-server
pm2 startup
pm2 save

# Set up Nginx reverse proxy (optional)
sudo apt-get install nginx
# Configure Nginx to proxy port 80/443 to port 5000
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user (requires auth)

### Projects
- `GET /api/projects` - Get all user's projects
- `GET /api/projects/:id` - Get single project
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Characters
- `GET /api/characters/project/:projectId` - Get project's characters
- `GET /api/characters/:id` - Get single character
- `POST /api/characters` - Create character
- `PUT /api/characters/:id` - Update character
- `DELETE /api/characters/:id` - Delete character

### Chapters
- `GET /api/chapters/project/:projectId` - Get project's chapters
- `GET /api/chapters/:id` - Get single chapter
- `POST /api/chapters` - Create chapter
- `PUT /api/chapters/:id` - Update chapter
- `DELETE /api/chapters/:id` - Delete chapter
- `POST /api/chapters/reorder` - Reorder chapters

All endpoints (except auth) require JWT token in Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Database Schema

### User Collection
```javascript
{
  email: String (unique, indexed),
  password: String (hashed with bcrypt),
  name: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Project Collection
```javascript
{
  userId: ObjectId (indexed),
  name: String,
  metadata: {
    title, subtitle, author, genre, synopsis, themes, targetWordCount
  },
  settings: {
    aiProvider, aiModel, aiApiKey
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Character Collection
```javascript
{
  projectId: ObjectId (indexed),
  userId: ObjectId (indexed),
  name: String,
  type: 'main' | 'secondary' | 'tertiary',
  quickDescription: String,
  fullBio: String,
  age: String,
  role: String,
  relationships: Array
}
```

### Chapter Collection
```javascript
{
  projectId: ObjectId (indexed),
  userId: ObjectId (indexed),
  title: String,
  content: String,
  synopsis: String,
  notes: String,
  order: Number,
  plotPoints: Array,
  wordCount: Number (auto-calculated)
}
```

## Security Best Practices

1. **JWT Secret**: Use a strong, randomly generated secret (min 32 characters)
2. **MongoDB**: Enable authentication and use strong passwords
3. **HTTPS**: Always use HTTPS in production
4. **Environment Variables**: Never commit `.env` files to Git
5. **CORS**: Configure `CLIENT_URL` to only allow your Electron app
6. **Rate Limiting**: Consider adding rate limiting for API endpoints
7. **Input Validation**: Already implemented with express-validator

## Troubleshooting

### Backend won't start
- Check MongoDB is running: `mongosh` or check Atlas connection
- Verify `.env` file exists and is properly configured
- Check port 5000 is not in use: `lsof -i :5000`

### Authentication errors
- Ensure JWT_SECRET is set and matches between restarts
- Check token is being sent in Authorization header
- Verify MongoDB connection

### Desktop app can't connect
- Check VITE_API_URL is correct
- Verify backend server is running
- Check CORS settings allow your origin
- Look at browser console in Developer Tools

### Database errors
- Verify MongoDB connection string
- Check MongoDB is running and accessible
- Ensure user has correct permissions

## Monitoring & Logs

```bash
# View server logs (if using PM2)
pm2 logs authorio-server

# View Docker logs
docker-compose logs -f server

# MongoDB logs
journalctl -u mongodb
```

## Backup & Restore

### Backup MongoDB
```bash
mongodump --uri="mongodb://localhost:27017/authorio" --out=./backup

# For Atlas
mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net/authorio" --out=./backup
```

### Restore MongoDB
```bash
mongorestore --uri="mongodb://localhost:27017/authorio" ./backup/authorio
```

## Scaling Considerations

1. **Database**: Use MongoDB Atlas for auto-scaling and backups
2. **Backend**: Deploy multiple instances behind a load balancer
3. **File Storage**: For large exports, consider S3/cloud storage
4. **Caching**: Add Redis for session management and caching
5. **CDN**: Serve static assets through a CDN

## Support

For issues or questions:
- Check the logs first
- Review this documentation
- Check GitHub issues
- Ensure all dependencies are up to date

## License

MIT - See LICENSE file for details



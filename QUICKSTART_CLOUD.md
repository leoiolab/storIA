# Authorio - Quick Start Guide (Cloud Version)

Get up and running with Authorio cloud storage in 5 minutes!

## What You'll Get

- ✅ Desktop app for macOS and Windows
- ✅ Cloud-based data storage
- ✅ Access your projects from any device
- ✅ Automatic backups
- ✅ User authentication

## Step-by-Step Setup

### 1. Install MongoDB (Choose One)

**Option A - Easy: MongoDB Atlas (Free Cloud Database)**
1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas/database)
2. Sign up for free account
3. Create a FREE cluster (M0)
4. Click "Connect" → "Connect your application"
5. Copy your connection string
   ```
   mongodb+srv://username:password@cluster.mongodb.net/authorio
   ```

**Option B - Local: Install MongoDB**
```bash
# macOS
brew install mongodb-community
brew services start mongodb-community

# Linux
sudo apt-get install mongodb
sudo systemctl start mongodb
```

### 2. Set Up Backend Server

```bash
# Clone or navigate to the project
cd authorio

# Install backend dependencies
cd server
npm install

# Create environment file
cp .env.example .env
```

Edit `server/.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/authorio  # or your Atlas connection
JWT_SECRET=paste-random-key-here
CLIENT_URL=http://localhost:3000
```

Generate a secure JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Start Backend

```bash
# Still in server/ directory
npm run dev
```

You should see:
```
✅ Connected to MongoDB
🚀 Authorio Server running on port 5000
```

Keep this terminal running!

### 4. Set Up Desktop App

Open a **new terminal**:

```bash
# Navigate to project root
cd authorio

# Install dependencies
npm install

# Build Electron
npm run build:electron

# Start the app
npm run dev
```

The Electron app will launch!

### 5. Create Your Account

1. The app opens to the login screen
2. Click **"Sign Up"**
3. Enter your:
   - Name
   - Email
   - Password (minimum 6 characters)
4. Click **"Create Account"**

🎉 You're in!

### 6. Start Writing

1. The app creates your first project automatically
2. Fill in your book details (title, author, genre)
3. Click **"Characters"** to add characters
4. Click **"Chapters"** to start writing
5. Everything saves automatically to the cloud!

## Quick Commands Reference

### Start Both Backend & Frontend

**Terminal 1 - Backend:**
```bash
cd authorio/server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd authorio
npm run dev
```

### Using Docker (Alternative)

```bash
# Start everything with one command
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Testing Your Setup

1. **Test Backend**: Open browser to `http://localhost:5000/health`
   - Should show: `{"status":"ok","database":"connected"}`

2. **Test Frontend**: The Electron app should open automatically

3. **Test Cloud Sync**:
   - Create a project in the app
   - Close the app
   - Reopen it
   - Your project is still there! ✅

## Common Issues & Fixes

### "MongoDB connection error"
- **Atlas**: Check connection string and whitelist your IP (0.0.0.0/0 for testing)
- **Local**: Ensure MongoDB is running: `brew services list` or `systemctl status mongodb`

### "Port 5000 already in use"
- Find and kill the process: `lsof -i :5000` then `kill -9 <PID>`
- Or change port in `server/.env`

### "Authentication required"
- Backend might not be running
- Check `VITE_API_URL` in root `.env` file
- Verify at `http://localhost:5000/health`

### App shows "Checking authentication..." forever
- Clear browser cache in app (Cmd+Shift+R on mac)
- Check browser console (View → Developer → Developer Tools)
- Restart backend server

## What's Next?

### Configure AI Features (Optional)
1. Click the project name at top
2. Select "Settings"
3. Choose AI provider (OpenAI or Anthropic)
4. Enter your API key
5. Enjoy AI-powered writing assistance!

### Access From Multiple Devices
1. Deploy backend to cloud (see `CLOUD_SETUP.md`)
2. Update `.env` with your cloud URL
3. Rebuild and distribute the app
4. Login on any device with your account

### Build Desktop App for Distribution
```bash
# Build production app
npm run build
npm run package

# Find installers in out/ directory
# - macOS: Authorio-1.0.0.dmg
# - Windows: Authorio Setup 1.0.0.exe
```

## Need Help?

- 📖 Full documentation: `CLOUD_SETUP.md`
- 🐛 Check logs: Backend terminal or Developer Tools console
- 🔧 Test connection: `http://localhost:5000/health`

## Tips for Success

- ✅ Keep backend terminal running while using the app
- ✅ Use MongoDB Atlas for easier setup (no local install needed)
- ✅ Set a strong JWT secret (minimum 32 characters)
- ✅ Your data syncs automatically - no save button needed!
- ✅ Use different email addresses for multiple accounts

---

**Happy Writing! 📚✨**

Your book project is now backed up in the cloud and accessible from anywhere!



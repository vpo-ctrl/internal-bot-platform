# Deploy to Render

**Deploy the dashboard to Render's free tier in 5 minutes.**

---

## Prerequisites

1. GitHub account (to host the code)
2. Render account (render.com)
3. Mac mini with running API server

---

## Step 1: Push Code to GitHub

```bash
# Initialize git repo (if not already done)
cd /Users/adiramsalem/.openclaw/workspace-alon/internal-bot-platform
git init
git add .
git commit -m "Initial commit: Internal Bot Platform"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/internal-bot-platform.git
git branch -M main
git push -u origin main
```

---

## Step 2: Set Up Render Account

1. Go to https://render.com
2. Sign up (free account)
3. Create new Web Service
4. Connect to GitHub (authorize)

---

## Step 3: Create Web Service on Render

### For Dashboard (Frontend)

**Settings:**
- **Name:** `internal-bot-dashboard`
- **Repository:** `YOUR_USERNAME/internal-bot-platform`
- **Branch:** `main`
- **Build Command:** `cd dashboard && npm install && npm run build`
- **Start Command:** `cd dashboard && npm run preview`
- **Node Version:** `18` or higher

**Environment Variables:**
```
VITE_API_URL=https://your-api-server.com
```

Replace `your-api-server.com` with your Mac mini's public IP or domain.

### For API Server (Backend)

**Settings:**
- **Name:** `internal-bot-api`
- **Repository:** `YOUR_USERNAME/internal-bot-platform`
- **Branch:** `main`
- **Build Command:** `cd api && npm install`
- **Start Command:** `node api/server.js`
- **Node Version:** `18` or higher

**Environment Variables:**
```
JWT_SECRET=your-super-secret-key-change-this
API_PASSWORD=your-password-change-this
PORT=3000
```

---

## Step 4: Set Up Mac Mini API Access

The API server on your Mac mini needs to be accessible from Render.

### Option A: Use ngrok (Easiest)

```bash
# Install ngrok
brew install ngrok

# Expose API
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Use this as VITE_API_URL in Render dashboard
```

### Option B: Port Forward (More Complex)

```bash
# Configure your router to forward port 3000 to Mac mini
# Use: https://your-public-ip:3000 as VITE_API_URL
```

---

## Step 5: Deploy

1. Go to Render dashboard
2. Click "Deploy"
3. Wait for build to complete (~5 minutes)
4. Access your dashboard at: `https://internal-bot-dashboard.onrender.com`

---

## Testing

**Login:**
- Username: `almali`
- Password: (your API_PASSWORD from env vars)

**Check:**
- ✅ Can view tasks
- ✅ Can add tasks
- ✅ Can view calendar
- ✅ Can add events
- ✅ Can search notes

---

## Troubleshooting

**API Connection Error:**
- Check VITE_API_URL is correct
- Verify Mac mini API is running
- Check ngrok tunnel is active

**Build Failed:**
- Check Node version (18+)
- Verify dependencies are installed
- Check build commands

**Login Not Working:**
- Verify JWT_SECRET and API_PASSWORD are set
- Check API server logs

---

## Environment Variables Checklist

**Dashboard (Render):**
- [ ] `VITE_API_URL` = your API URL

**API Server (Render or Mac mini):**
- [ ] `JWT_SECRET` = unique random string
- [ ] `API_PASSWORD` = your login password
- [ ] `PORT` = 3000 (for Mac mini) or 3000 (for Render)

---

## Security Notes

🔒 **HTTPS Only** - Render provides free SSL certificates
🔒 **Authentication** - JWT tokens expire in 7 days
🔒 **Password** - Change `API_PASSWORD` from default
🔒 **Secret Key** - Change `JWT_SECRET` from default

---

## Cost

✅ **Free:**
- Render Web Service (free tier)
- GitHub (free public repo)
- ngrok (free with limits)
- SSL/HTTPS (free on Render)

💰 **Optional:**
- Custom domain (~$10/year)
- ngrok paid tier (unlimited)

---

## Next Steps

Once deployed:
1. Add Telegram integration for voice messages
2. Set up webhook for voice notifications
3. Configure cron for daily briefing delivery

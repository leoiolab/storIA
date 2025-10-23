# Authorio AWS Deployment Guide

Complete guide to deploying Authorio on Amazon Web Services (AWS).

## Overview

This guide covers deploying the Authorio backend API and database on AWS. The Electron desktop app will connect to your AWS-hosted backend.

## Architecture

```
┌─────────────────┐
│  Desktop App    │  (macOS/Windows - distributed to users)
│   (Electron)    │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│   AWS Cloud     │
│                 │
│  ┌───────────┐  │
│  │  Route53  │  │  (Optional: Custom domain)
│  └─────┬─────┘  │
│        │        │
│  ┌─────▼─────┐  │
│  │ ELB/ALB   │  │  (Load Balancer with SSL)
│  └─────┬─────┘  │
│        │        │
│  ┌─────▼─────┐  │
│  │    EC2    │  │  (Node.js API Server)
│  │  (Backend)│  │
│  └─────┬─────┘  │
│        │        │
│  ┌─────▼─────┐  │
│  │ DocumentDB│  │  (MongoDB-compatible)
│  │    or     │  │  or Atlas (external)
│  │  MongoDB  │  │
│  └───────────┘  │
└─────────────────┘
```

## AWS Services Required

### Essential Services
1. **EC2** - Virtual server for Node.js backend
2. **DocumentDB** or **MongoDB Atlas** - Database
3. **Security Groups** - Firewall rules
4. **IAM** - User permissions

### Recommended Services
5. **Application Load Balancer (ALB)** - HTTPS/SSL termination
6. **Route 53** - DNS management (if using custom domain)
7. **Certificate Manager (ACM)** - Free SSL certificates
8. **Elastic IP** - Static IP address
9. **CloudWatch** - Monitoring and logs

## Cost Estimate

### Minimal Setup (Development/Testing)
- **EC2 t3.micro**: ~$7.50/month
- **DocumentDB t3.medium**: ~$0.077/hour = ~$56/month
- **OR MongoDB Atlas M0**: FREE
- **Elastic IP**: Free when attached
- **Total**: ~$65/month (or ~$8/month with Atlas)

### Production Setup
- **EC2 t3.small**: ~$15/month
- **DocumentDB t3.medium (with backup)**: ~$70/month
- **Application Load Balancer**: ~$16/month
- **Route 53**: ~$0.50/month
- **Total**: ~$100/month

**💡 Recommendation**: Start with MongoDB Atlas (free tier) to minimize costs!

## Prerequisites

- AWS Account ([aws.amazon.com](https://aws.amazon.com))
- AWS CLI installed ([docs.aws.amazon.com/cli](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html))
- Basic terminal/SSH knowledge

## Deployment Options

### Option 1: EC2 + MongoDB Atlas (Easiest & Cheapest) ⭐

This is the recommended approach for getting started.

#### Step 1: Set Up MongoDB Atlas

1. Go to [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas)
2. Create FREE account (M0 tier)
3. Create cluster (choose AWS as provider, same region as your EC2)
4. Database Access → Add New User (create username/password)
5. Network Access → Add IP Address → Allow Access from Anywhere (0.0.0.0/0)
6. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/authorio`

#### Step 2: Launch EC2 Instance

```bash
# Login to AWS Console
# Navigate to EC2 Dashboard

# Click "Launch Instance"
```

**Instance Configuration:**
- **Name**: authorio-server
- **AMI**: Ubuntu Server 22.04 LTS
- **Instance Type**: t3.micro (or t3.small for production)
- **Key Pair**: Create new or use existing (download .pem file)
- **Network Settings**:
  - Allow SSH (port 22) from your IP
  - Allow HTTP (port 80) from anywhere
  - Allow HTTPS (port 443) from anywhere
  - Allow Custom TCP (port 5000) from anywhere (temporary)
- **Storage**: 20 GB gp3
- Click **"Launch Instance"**

#### Step 3: Connect to EC2

```bash
# Make key file secure
chmod 400 your-key.pem

# Connect via SSH
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

#### Step 4: Install Node.js and Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Git
sudo apt install -y git

# Install PM2 (process manager)
sudo npm install -g pm2

# Verify installations
node --version  # Should show v20.x.x
npm --version
```

#### Step 5: Deploy Backend Application

```bash
# Clone your repository (or upload files)
git clone https://github.com/yourusername/authorio.git
# OR upload via SCP:
# scp -i your-key.pem -r ./server ubuntu@YOUR_EC2_IP:~/authorio/

cd authorio/server

# Install dependencies
npm install

# Create production environment file
nano .env
```

**Configure .env:**
```env
PORT=5000
NODE_ENV=production

# Your MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/authorio?retryWrites=true&w=majority

# Generate secure JWT secret (32+ characters)
JWT_SECRET=your-super-long-secure-random-string-min-32-chars

# Your EC2 public IP or domain
CLIENT_URL=http://YOUR_EC2_PUBLIC_IP:3000

JWT_EXPIRES_IN=7d
```

Save and exit (Ctrl+X, Y, Enter)

#### Step 6: Build and Start Server

```bash
# Build TypeScript
npm run build

# Start with PM2
pm2 start dist/index.js --name authorio-server

# Configure PM2 to start on boot
pm2 startup
# Copy and run the command it outputs
pm2 save

# Check status
pm2 status
pm2 logs authorio-server
```

#### Step 7: Configure Nginx (Reverse Proxy)

```bash
# Install Nginx
sudo apt install -y nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/authorio
```

**Nginx Config:**
```nginx
server {
    listen 80;
    server_name YOUR_EC2_PUBLIC_IP;  # or your-domain.com

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Save and exit.

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/authorio /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Enable Nginx on boot
sudo systemctl enable nginx
```

#### Step 8: Test Your Deployment

```bash
# Test health endpoint
curl http://YOUR_EC2_PUBLIC_IP/api/health

# Should return:
# {"status":"ok","database":"connected","timestamp":"..."}
```

#### Step 9: Configure Desktop App

On your local machine, update `.env`:
```env
VITE_API_URL=http://YOUR_EC2_PUBLIC_IP/api
```

Rebuild and test the Electron app:
```bash
npm run build:electron
npm run dev
```

### Option 2: EC2 + DocumentDB (AWS Native)

For a fully AWS-native solution using DocumentDB.

#### Additional Steps:

1. **Create DocumentDB Cluster**:
   - Go to DocumentDB in AWS Console
   - Create cluster (t3.medium instance)
   - Set master username/password
   - Same VPC as your EC2 instance

2. **Update Security Groups**:
   - DocumentDB security group: Allow port 27017 from EC2 security group
   - EC2 security group: Allow outbound to DocumentDB

3. **Get Connection String**:
   ```
   mongodb://username:password@docdb-cluster.cluster-xxx.region.docdb.amazonaws.com:27017/?replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false
   ```

4. **Download Certificate**:
   ```bash
   cd ~/authorio/server
   wget https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem
   ```

5. **Update .env**:
   ```env
   MONGODB_URI=mongodb://username:password@docdb-cluster.cluster-xxx.region.docdb.amazonaws.com:27017/authorio?tls=true&tlsCAFile=global-bundle.pem&replicaSet=rs0&readPreference=secondaryPreferred&retryWrites=false
   ```

### Option 3: Docker on EC2

Deploy using Docker for easier management.

```bash
# Install Docker
sudo apt install -y docker.io docker-compose
sudo usermod -aG docker ubuntu
# Logout and login again

# Navigate to project
cd authorio

# Create docker-compose.yml for production
nano docker-compose.prod.yml
```

**docker-compose.prod.yml:**
```yaml
version: '3.8'

services:
  server:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: authorio-server
    restart: always
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
      PORT: 5000
      MONGODB_URI: ${MONGODB_URI}
      JWT_SECRET: ${JWT_SECRET}
      CLIENT_URL: ${CLIENT_URL}
```

```bash
# Build and start
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f
```

## Adding HTTPS (SSL/TLS)

### Option A: Let's Encrypt (Free)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate (requires domain name)
sudo certbot --nginx -d your-domain.com

# Certbot will automatically configure Nginx
# Certificates auto-renew
```

### Option B: AWS Certificate Manager + ALB

1. **Request Certificate** in ACM
2. **Create Application Load Balancer**:
   - Add listeners: HTTP (80) → HTTPS (443)
   - Attach SSL certificate from ACM
   - Target: Your EC2 instance on port 5000
3. **Update CLIENT_URL** to use ALB DNS name

## Custom Domain Setup

1. **Register Domain** (Route 53 or external)
2. **Create Hosted Zone** in Route 53
3. **Create A Record**:
   - Name: api.yourdomain.com
   - Type: A
   - Value: Your EC2 Elastic IP or ALB DNS (Alias)
4. **Update .env**:
   ```env
   CLIENT_URL=https://api.yourdomain.com
   ```
5. **Update Desktop App** `.env`:
   ```env
   VITE_API_URL=https://api.yourdomain.com/api
   ```

## Security Best Practices

### 1. Secure Security Groups

```
EC2 Security Group:
- SSH (22): Your IP only
- HTTP (80): 0.0.0.0/0
- HTTPS (443): 0.0.0.0/0
- Remove: Custom TCP 5000

DocumentDB Security Group:
- MongoDB (27017): EC2 security group only
```

### 2. Environment Variables

Never commit `.env` files. Use AWS Secrets Manager for production.

### 3. Firewall

```bash
# Enable UFW firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 4. Regular Updates

```bash
# Create update script
sudo apt update && sudo apt upgrade -y
```

### 5. Backups

**MongoDB Atlas**: Automatic backups included

**DocumentDB**: Enable automated backups in console

## Monitoring & Maintenance

### View Logs

```bash
# PM2 logs
pm2 logs authorio-server

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# System logs
journalctl -u nginx -f
```

### CloudWatch Setup

```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# Configure agent (requires IAM role with CloudWatch permissions)
```

### Restart Services

```bash
# Restart backend
pm2 restart authorio-server

# Restart Nginx
sudo systemctl restart nginx

# Reboot server
sudo reboot
```

## Updating Your Application

```bash
# SSH to server
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# Pull latest code
cd authorio/server
git pull origin main

# Install dependencies
npm install

# Rebuild
npm run build

# Restart
pm2 restart authorio-server
```

## Troubleshooting

### Can't connect to server
```bash
# Check if server is running
pm2 status

# Check logs
pm2 logs authorio-server

# Check Nginx
sudo systemctl status nginx
sudo nginx -t

# Check firewall
sudo ufw status
```

### Database connection errors
```bash
# Test MongoDB connection
mongosh "YOUR_MONGODB_URI"

# Check network access in Atlas
# Verify security groups in AWS
```

### SSL certificate issues
```bash
# Test certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew --dry-run
```

## Scaling Considerations

### Vertical Scaling
- Upgrade EC2 instance type (t3.small → t3.medium)
- Upgrade DocumentDB instance

### Horizontal Scaling
- Multiple EC2 instances behind ALB
- Redis for session management
- S3 for static file storage

### Auto Scaling
- Create AMI from configured EC2
- Set up Auto Scaling Group
- Configure target tracking

## Cost Optimization

1. **Use Reserved Instances** (1-year commitment = 40% savings)
2. **Use MongoDB Atlas M0** (free tier)
3. **Enable AWS Budgets** (alerts at $50, $100)
4. **Stop EC2 during off-hours** (if not production)
5. **Use Spot Instances** (for non-critical workloads)

## Complete Checklist

- [ ] AWS account created
- [ ] MongoDB Atlas cluster created (or DocumentDB)
- [ ] EC2 instance launched
- [ ] Security groups configured
- [ ] SSH key downloaded and secured
- [ ] Node.js and dependencies installed
- [ ] Application code deployed
- [ ] Environment variables configured
- [ ] PM2 process manager set up
- [ ] Nginx reverse proxy configured
- [ ] Health check passes
- [ ] Desktop app connects successfully
- [ ] SSL/HTTPS configured (optional)
- [ ] Domain name configured (optional)
- [ ] Backups enabled
- [ ] Monitoring set up

## Quick Command Reference

```bash
# SSH to server
ssh -i key.pem ubuntu@IP

# Check server status
pm2 status
pm2 logs

# Restart services
pm2 restart authorio-server
sudo systemctl restart nginx

# View resource usage
htop
df -h
free -m

# Check connections
netstat -tulpn | grep :5000
curl localhost:5000/api/health

# Update application
cd authorio/server
git pull
npm install
npm run build
pm2 restart authorio-server
```

## Support & Resources

- [AWS Documentation](https://docs.aws.amazon.com/)
- [MongoDB Atlas Docs](https://docs.atlas.mongodb.com/)
- [PM2 Documentation](https://pm2.keymetrics.io/)
- [Nginx Documentation](https://nginx.org/en/docs/)

## Next Steps

1. Follow Option 1 (EC2 + Atlas) for quickest deployment
2. Test thoroughly before distributing desktop app
3. Set up monitoring and alerts
4. Configure automated backups
5. Document your specific configuration

---

**Need Help?** Make sure to check logs first: `pm2 logs authorio-server`

Good luck with your AWS deployment! 🚀



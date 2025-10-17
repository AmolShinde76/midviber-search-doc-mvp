# Hostinger VPS Deployment Guide for Medical Document Search Assistant

## Prerequisites
- Hostinger VPS with Ubuntu Linux
- Domain name pointing to your VPS IP
- OpenAI API key

## Hostinger VPS Specific Setup

### 1. Access Your VPS
- Login to Hostinger control panel
- Go to VPS section and click "Manage" for your VPS
- Note the IP address and SSH credentials
- Connect via SSH: `ssh root@your-vps-ip`

### 2. Initial Server Setup

#### Update System
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git ufw software-properties-common
```

#### Install Node.js (for frontend build)
```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

#### Install Python 3.9+ (for backend)
```bash
sudo apt install -y python3 python3-pip python3-venv python3-dev
python3 --version
```

#### Install Nginx
```bash
sudo apt install -y nginx
sudo systemctl status nginx
```

#### Configure Firewall (Hostinger specific)
```bash
# Check current firewall status
sudo ufw status

# Allow SSH and HTTP/HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Verify
sudo ufw status
```

### 3. Deploy Application

#### Create Application Directory
```bash
# Create directory structure
sudo mkdir -p /var/www/medical-search
sudo chown -R $USER:$USER /var/www/medical-search
cd /var/www/medical-search
```

#### Upload Your Code
You can upload your project files using:
- **SFTP/SCP**: `scp -r /local/path/medical-search root@your-vps-ip:/var/www/`
- **Git**: `git clone your-repo-url .`
- **Hostinger File Manager**: Upload via control panel

### 4. Setup Backend

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
nano .env
```

Add to `.env`:
```
OPENAI_API_KEY=your-actual-openai-api-key-here
BACKEND_PORT=8000
ALLOWED_ORIGINS=https://yourdomain.com,http://localhost:3000,http://localhost:5173
```

### 5. Setup Backend as Systemd Service

Create service file:
```bash
sudo nano /etc/systemd/system/medical-backend.service
```

Add:
```
[Unit]
Description=Medical Document Search Backend
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/medical-search/backend
Environment="PATH=/var/www/medical-search/backend/venv/bin"
ExecStart=/var/www/medical-search/backend/venv/bin/python start.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable medical-backend
sudo systemctl start medical-backend

# Check status
sudo systemctl status medical-backend
```

### 6. Setup Frontend

```bash
cd ../frontend/my-app

# Install dependencies
npm install

# Create production environment file
nano .env.production
```
Add:
```
VITE_API_BASE_URL=https://yourdomain.com/api
```

Build for production:
```bash
npm run build

# Verify build
ls -la dist/
```

### 7. Configure Nginx (Hostinger Optimized)

```bash
# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Create our configuration
sudo nano /etc/nginx/sites-available/medical-search
```

Add configuration:
```
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL configuration (will be added by Certbot)
    # ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Frontend - static files
    root /var/www/medical-search/frontend/my-app/dist;
    index index.html;

    # API proxy
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $server_name;

        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # PDF files
    location /pdf/ {
        proxy_pass http://localhost:8000/pdf/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Allow larger files
        client_max_body_size 50M;
    }

    # Health check
    location /api/health {
        proxy_pass http://localhost:8000/health;
        proxy_set_header Host $host;
        access_log off;
    }

    # Frontend routes (SPA)
    location / {
        try_files $uri $uri/ /index.html;

        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://yourdomain.com;" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/medical-search /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 8. SSL Certificate with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test renewal
sudo certbot renew --dry-run
```

### 9. Final Configuration

Update backend `.env` with production origins:
```bash
nano backend/.env
```
Update ALLOWED_ORIGINS:
```
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### 10. Hostinger Specific Considerations

#### DNS Configuration
1. Login to Hostinger control panel
2. Go to Domain → DNS
3. Add A record: `@` → your VPS IP
4. Add A record: `www` → your VPS IP
5. Wait for DNS propagation (can take up to 24 hours)

#### Firewall (Hostinger Control Panel)
- Hostinger may have additional firewall rules
- Check VPS control panel for any firewall settings
- Ensure ports 80, 443 are open

#### Resource Monitoring
- Hostinger provides resource monitoring in control panel
- Monitor CPU, RAM, and disk usage
- Consider upgrading plan if needed

### 11. Testing Deployment

```bash
# Test backend
curl http://localhost:8000/health

# Test frontend (after SSL setup)
curl -I https://yourdomain.com

# Check services
sudo systemctl status medical-backend
sudo systemctl status nginx

# View logs
sudo journalctl -u medical-backend -f
sudo tail -f /var/log/nginx/error.log
```

### 12. Troubleshooting (Hostinger VPS)

#### Common Hostinger Issues:

1. **Permission Denied**: Use `sudo` for system commands
2. **Port Already in Use**: Check what's using ports 80/443
   ```bash
   sudo netstat -tulpn | grep :80
   sudo netstat -tulpn | grep :443
   ```

3. **Firewall Blocking**: Check both UFW and Hostinger control panel firewall

4. **Memory Issues**: Hostinger VPS might have limited RAM
   ```bash
   free -h
   # If low memory, consider swap file
   sudo fallocate -l 1G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```

5. **Domain Not Resolving**: Wait for DNS propagation or check DNS settings

### 13. Backup Strategy

```bash
# Create backup script
sudo nano /usr/local/bin/backup-medical-search.sh
```

Add:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/medical-search"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/medical-search_$DATE.tar.gz -C /var/www medical-search

# Keep only last 7 backups
cd $BACKUP_DIR
ls -t *.tar.gz | tail -n +8 | xargs -r rm
```

Make executable and schedule:
```bash
sudo chmod +x /usr/local/bin/backup-medical-search.sh
# Add to crontab for daily backup
echo "0 2 * * * /usr/local/bin/backup-medical-search.sh" | sudo crontab -
```

### 14. Monitoring & Maintenance

#### Check Application Health
```bash
# Create monitoring script
sudo nano /usr/local/bin/check-health.sh
```

Add:
```bash
#!/bin/bash
# Check if services are running
if ! systemctl is-active --quiet medical-backend; then
    echo "Backend service is down!"
    exit 1
fi

if ! systemctl is-active --quiet nginx; then
    echo "Nginx service is down!"
    exit 1
fi

# Check health endpoint
if ! curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "Health check failed!"
    exit 1
fi

echo "All services healthy"
```

#### Log Rotation
```bash
# Ensure log rotation is configured
sudo nano /etc/logrotate.d/medical-search
```

Add:
```
/var/log/medical-search/*.log {
    daily
    missingok
    rotate 7
    compress
    notifempty
    create 0644 www-data www-data
}
```

### 15. Performance Optimization

#### For Hostinger VPS (Limited Resources):

1. **Enable Swap** (if not already done)
2. **Optimize Nginx**:
   ```bash
   sudo nano /etc/nginx/nginx.conf
   ```
   Add in http block:
   ```
   worker_processes auto;
   worker_connections 1024;
   ```

3. **Cache Optimization**:
   - Static assets are already cached in nginx config
   - Consider Redis for session storage if needed

4. **Monitor Resource Usage**:
   ```bash
   # Install monitoring tools
   sudo apt install -y htop iotop
   ```

### 16. Security Checklist

- [ ] SSH key authentication (disable password login)
- [ ] Regular system updates: `sudo apt update && sudo apt upgrade`
- [ ] Fail2Ban installation: `sudo apt install fail2ban`
- [ ] API key properly secured in environment variables
- [ ] File permissions: `sudo chown -R www-data:www-data /var/www/medical-search`
- [ ] SSL certificate valid and auto-renewing
- [ ] Firewall configured (both UFW and Hostinger panel)
- [ ] No sensitive data in logs

### 17. Cost Optimization

**Hostinger VPS Plans**: Start with their basic plan (~$3.99/month) and upgrade if needed
**OpenAI Costs**: Monitor usage at https://platform.openai.com/usage
**Backup Storage**: Use Hostinger's backup features or external storage

### 18. Support Resources

- **Hostinger Support**: Use their 24/7 live chat for VPS issues
- **Application Issues**: Check logs and health endpoints
- **OpenAI Issues**: Monitor API usage and rate limits

---

## Quick Hostinger Deployment Checklist

- [ ] Get VPS and note IP/credentials
- [ ] Point domain to VPS IP in Hostinger DNS
- [ ] SSH into server
- [ ] Run system updates
- [ ] Install Node.js, Python, Nginx
- [ ] Configure firewall
- [ ] Upload application code
- [ ] Setup backend (venv, dependencies, .env)
- [ ] Setup frontend (npm install, build)
- [ ] Configure systemd service
- [ ] Setup Nginx configuration
- [ ] Install SSL certificate
- [ ] Test application
- [ ] Setup monitoring and backups

**Need Help?** Check the troubleshooting section or contact Hostinger support for VPS-specific issues.
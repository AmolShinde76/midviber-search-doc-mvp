# VPS Deployment Guide for Medical Document Search Assistant

## Prerequisites
- VPS with Ubuntu 20.04+ or Debian 11+
- Domain name pointing to your VPS IP
- OpenAI API key

## 1. Initial Server Setup

### Update System
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git ufw
```

### Install Node.js (for frontend build)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Install Python 3.9+ (for backend)
```bash
sudo apt install -y python3 python3-pip python3-venv
```

### Install Nginx
```bash
sudo apt install -y nginx
```

### Configure Firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

## 2. Deploy Application

### Clone/Upload Code
```bash
cd /var/www
sudo mkdir medical-search
sudo chown $USER:$USER medical-search
cd medical-search
# Upload your project files here
```

### Setup Backend

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

### Setup Backend as Systemd Service

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

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable medical-backend
sudo systemctl start medical-backend
```

### Setup Frontend

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
```

### Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/medical-search
```

Add configuration:
```
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend
    root /var/www/medical-search/frontend/my-app/dist;
    index index.html;

    # API proxy
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # PDF files
    location /pdf/ {
        proxy_pass http://localhost:8000/pdf/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend routes (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/medical-search /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 3. SSL Certificate (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## 4. Update Backend Configuration

After SSL setup, update `.env`:
```
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

And update Nginx config to redirect HTTP to HTTPS if not done by certbot.

## 5. Monitoring & Maintenance

### Check service status
```bash
sudo systemctl status medical-backend
sudo systemctl status nginx
```

### View logs
```bash
sudo journalctl -u medical-backend -f
sudo tail -f /var/log/nginx/error.log
```

### Update application
```bash
cd /var/www/medical-search
# Pull latest changes
cd frontend/my-app && npm install && npm run build
sudo systemctl restart medical-backend
sudo systemctl reload nginx
```

## 6. Troubleshooting

### Common Issues

1. **Backend not starting**: Check OpenAI API key and Python dependencies
2. **Frontend not loading**: Check build process and Nginx configuration
3. **API calls failing**: Verify VITE_API_BASE_URL and CORS settings
4. **PDF not loading**: Check file permissions and backend PDF serving

### Performance Tuning

- Consider using a process manager like Gunicorn for production
- Set up log rotation
- Configure rate limiting in Nginx
- Monitor resource usage

## 7. Security Checklist

- [ ] SSH key authentication only (disable password)
- [ ] Regular system updates
- [ ] Fail2Ban for SSH protection
- [ ] API key stored securely
- [ ] File permissions set correctly
- [ ] SSL certificate valid
- [ ] Firewall configured
- [ ] No sensitive data in logs
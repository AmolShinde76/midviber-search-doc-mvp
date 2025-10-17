#!/bin/bash

# Medical Document Search - Production Deployment Script
# Run this on your VPS after uploading the code

set -e

echo "🚀 Starting Medical Document Search deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}This script should not be run as root${NC}"
   exit 1
fi

# Update system
echo -e "${YELLOW}Updating system...${NC}"
sudo apt update && sudo apt upgrade -y

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
sudo apt install -y curl wget git ufw nginx python3 python3-pip python3-venv nodejs npm

# Configure firewall
echo -e "${YELLOW}Configuring firewall...${NC}"
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Setup backend
echo -e "${YELLOW}Setting up backend...${NC}"
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Setup systemd service
echo -e "${YELLOW}Setting up systemd service...${NC}"
sudo cp medical-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable medical-backend

# Setup frontend
echo -e "${YELLOW}Setting up frontend...${NC}"
cd ../frontend/my-app

# Install Node dependencies
npm install

# Build for production
npm run build

# Setup Nginx
echo -e "${YELLOW}Setting up Nginx...${NC}"
sudo cp ../../nginx.conf /etc/nginx/sites-available/medical-search
sudo ln -sf /etc/nginx/sites-available/medical-search /etc/nginx/sites-enabled/
sudo nginx -t

echo -e "${GREEN}✅ Deployment setup complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Update domain name in nginx.conf and .env.production"
echo "2. Set your OpenAI API key in backend/.env"
echo "3. Run: sudo certbot --nginx -d yourdomain.com"
echo "4. Start services: sudo systemctl start medical-backend && sudo systemctl reload nginx"
echo "5. Visit https://yourdomain.com"
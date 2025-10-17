#!/bin/bash

# Hostinger VPS Deployment Script for Medical Document Search Assistant
# This script is optimized for Hostinger VPS environment

set -e

echo "=========================================="
echo "  Hostinger VPS Deployment"
echo "  Medical Document Search Assistant"
echo "=========================================="
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}This script should not be run as root${NC}"
   exit 1
fi

echo -e "${BLUE}🚀 Starting Hostinger VPS deployment...${NC}"
echo

# Function to check command success
check_command() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1${NC}"
    else
        echo -e "${RED}✗ $1 failed${NC}"
        exit 1
    fi
}

# Update system
echo -e "${YELLOW}📦 Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y
check_command "System update"

# Install essential packages
echo -e "${YELLOW}📦 Installing essential packages...${NC}"
sudo apt install -y curl wget git ufw software-properties-common htop iotop
check_command "Essential packages installation"

# Install Node.js
echo -e "${YELLOW}📦 Installing Node.js 18...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
check_command "Node.js installation"

# Verify Node.js
node --version
npm --version

# Install Python and development tools
echo -e "${YELLOW}📦 Installing Python 3 and development tools...${NC}"
sudo apt install -y python3 python3-pip python3-venv python3-dev
check_command "Python installation"

# Install Nginx
echo -e "${YELLOW}📦 Installing Nginx...${NC}"
sudo apt install -y nginx
check_command "Nginx installation"

# Configure firewall
echo -e "${YELLOW}🔥 Configuring firewall...${NC}"
sudo ufw --force enable
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
check_command "Firewall configuration"

# Create application directory
echo -e "${YELLOW}📁 Creating application directory...${NC}"
sudo mkdir -p /var/www/medical-search
sudo chown -R $USER:$USER /var/www/medical-search
check_command "Application directory creation"

# Check if application code exists
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}❌ Application code not found in current directory${NC}"
    echo -e "${YELLOW}Please ensure you're running this script from the medical-search project root${NC}"
    echo -e "${YELLOW}Or upload your code to /var/www/medical-search first${NC}"
    exit 1
fi

# Copy application code
echo -e "${YELLOW}📋 Copying application code...${NC}"
cp -r . /var/www/medical-search/
cd /var/www/medical-search
check_command "Application code copy"

# Setup backend
echo -e "${YELLOW}🐍 Setting up backend...${NC}"
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt
check_command "Backend dependencies installation"

# Setup systemd service
echo -e "${YELLOW}⚙️ Setting up systemd service...${NC}"
sudo cp medical-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable medical-backend
check_command "Systemd service setup"

# Setup frontend
echo -e "${YELLOW}⚛️ Setting up frontend...${NC}"
cd ../frontend/my-app

# Install Node dependencies
npm install
check_command "Frontend dependencies installation"

# Build for production
npm run build
check_command "Frontend build"

# Setup Nginx
echo -e "${YELLOW}🌐 Setting up Nginx configuration...${NC}"
sudo cp ../../nginx.conf /etc/nginx/sites-available/medical-search
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/medical-search /etc/nginx/sites-enabled/
sudo nginx -t
check_command "Nginx configuration"

# Install Certbot for SSL
echo -e "${YELLOW}🔒 Installing Certbot for SSL...${NC}"
sudo apt install -y certbot python3-certbot-nginx
check_command "Certbot installation"

# Create swap file (Hostinger VPS often has limited RAM)
echo -e "${YELLOW}💾 Creating swap file for better performance...${NC}"
if [ ! -f /swapfile ]; then
    sudo fallocate -l 1G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    check_command "Swap file creation"
else
    echo -e "${BLUE}Swap file already exists${NC}"
fi

# Set proper permissions
echo -e "${YELLOW}🔐 Setting proper permissions...${NC}"
sudo chown -R www-data:www-data /var/www/medical-search
check_command "Permissions setup"

echo
echo -e "${GREEN}✅ Hostinger VPS deployment setup complete!${NC}"
echo
echo -e "${BLUE}📋 Next steps:${NC}"
echo "1. Update your domain name in /etc/nginx/sites-available/medical-search"
echo "2. Update VITE_API_BASE_URL in frontend/my-app/.env.production"
echo "3. Set your OpenAI API key in backend/.env"
echo "4. Run: sudo certbot --nginx -d yourdomain.com"
echo "5. Start services:"
echo "   sudo systemctl start medical-backend"
echo "   sudo systemctl reload nginx"
echo "6. Visit https://yourdomain.com"
echo
echo -e "${YELLOW}📖 For detailed instructions, see HOSTINGER-DEPLOYMENT.md${NC}"
echo -e "${YELLOW}🆘 For Hostinger-specific help, contact their 24/7 support${NC}"
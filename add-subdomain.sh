#!/bin/bash

# Update existing deployment to add subdomain support
# Run this on your VPS after initial deployment

echo "🔄 Updating deployment for subdomain support..."

# Backup current nginx config
sudo cp /etc/nginx/sites-available/medical-search /etc/nginx/sites-available/medical-search.backup

# Update nginx config to include subdomain
echo "📝 Updating Nginx configuration..."
sudo sed -i 's/server_name yourdomain.com www.yourdomain.com;/server_name yourdomain.com www.yourdomain.com gpt.yourdomain.com;/g' /etc/nginx/sites-available/medical-search

# Test nginx configuration
echo "🧪 Testing Nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
    echo "🔄 Reloading Nginx..."
    sudo systemctl reload nginx
else
    echo "❌ Nginx configuration error! Restoring backup..."
    sudo cp /etc/nginx/sites-available/medical-search.backup /etc/nginx/sites-available/medical-search
    sudo nginx -t && sudo systemctl reload nginx
    exit 1
fi

# Update SSL certificate to include subdomain
echo "🔒 Updating SSL certificate for subdomain..."
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d gpt.yourdomain.com

# Update backend environment
echo "⚙️ Updating backend configuration..."
# Note: You'll need to manually update backend/.env to include the subdomain in ALLOWED_ORIGINS

echo ""
echo "✅ Subdomain update complete!"
echo ""
echo "📋 Next steps:"
echo "1. Add DNS A record: gpt.yourdomain.com → your VPS IP"
echo "2. Update backend/.env ALLOWED_ORIGINS to include https://gpt.yourdomain.com"
echo "3. Restart backend: sudo systemctl restart medical-backend"
echo "4. Test: https://gpt.yourdomain.com"
echo ""
echo "⏱️ DNS propagation may take up to 24 hours"
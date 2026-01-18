#!/bin/bash

echo "Setting up CollabDraw server..."

# Install nginx if not already installed
if ! command -v nginx &> /dev/null; then
    echo "Installing nginx..."
    sudo apt update
    sudo apt install -y nginx
fi

# Copy nginx configuration
echo "Configuring nginx..."
sudo cp nginx.conf /etc/nginx/sites-available/collabdraw
sudo ln -sf /etc/nginx/sites-available/collabdraw /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
echo "Testing nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "Nginx configuration is valid. Restarting nginx..."
    sudo systemctl restart nginx
    sudo systemctl enable nginx
else
    echo "Nginx configuration has errors. Please check the configuration."
    exit 1
fi

# Install PM2 globally if not already installed
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

echo "Server setup completed! ✅"
echo ""
echo "Next steps:"
echo "1. Run './deploy.sh' to deploy your application"
echo "2. Check PM2 status with 'pm2 status'"
echo "3. Check nginx status with 'sudo systemctl status nginx'"
echo "4. View logs with 'pm2 logs' or 'sudo tail -f /var/log/nginx/error.log'"
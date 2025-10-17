# Medical Document Search Assistant

A full-stack application for AI-powered Q&A on medical documents using OpenAI's Assistant API.

## Features

- **Document Upload & Search**: Upload medical documents and ask questions
- **AI-Powered Responses**: Get accurate answers using OpenAI GPT-4o-mini
- **Real-time Streaming**: Fast streaming responses for better UX
- **PDF Viewer**: Integrated document viewing with page navigation
- **Secure**: Environment-based configuration and input validation

## Quick Start

### ⚡ One-Click Start (Windows)
```bash
# Double-click this file to start both frontend and backend
start.bat
```

### 🐧 One-Click Start (Linux/Mac)
```bash
chmod +x start.sh
./start.sh
```

### Manual Start

1. **Set your OpenAI API key** in `backend/.env`:
   ```
   OPENAI_API_KEY=sk-your-actual-openai-api-key-here
   ```

2. **Start Backend**:
   ```bash
   cd backend
   python start.py
   ```

3. **Start Frontend** (in new terminal):
   ```bash
   cd frontend/my-app
   npm run dev
   ```

## Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 🚀 Production Deployment

### VPS Requirements
- Ubuntu 20.04+ or Debian 11+
- 2GB RAM minimum, 4GB recommended
- Domain name pointing to VPS IP

### Hostinger VPS Deployment
If you're using Hostinger VPS, see **[HOSTINGER-DEPLOYMENT.md](HOSTINGER-DEPLOYMENT.md)** for detailed, Hostinger-specific instructions.

### Quick Deploy (Automated)
```bash
# For Hostinger VPS
chmod +x hostinger-deploy.sh
./hostinger-deploy.sh

# For other VPS providers
chmod +x deploy.sh
./deploy.sh
```

### Manual Deployment
See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

### Post-Deployment
1. Update domain in `nginx.conf` and `frontend/my-app/.env.production`
2. Set your OpenAI API key in `backend/.env`
3. Run `sudo certbot --nginx -d yourdomain.com` for SSL
4. **For subdomain support**: Add `gpt.yourdomain.com` to DNS and SSL certificates
5. Start services and visit `https://yourdomain.com` or `https://gpt.yourdomain.com`

## Features

✅ **Fast Streaming Responses** - Real-time AI answers
✅ **Enterprise Security** - Environment variables, input validation, CORS protection
✅ **Production Ready** - Error handling, logging, proper architecture
✅ **Medical Document Support** - PDF viewing, Q&A on medical content
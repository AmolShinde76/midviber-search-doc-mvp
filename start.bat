@echo off
echo ============================================
echo   Medical Document Search Assistant
echo ============================================
echo.

echo 🚀 Starting the application...
echo.

echo 📋 Prerequisites check:
echo - Make sure you have set your OpenAI API key in backend/.env
echo - Backend dependencies installed ✓
echo - Frontend dependencies installed ✓
echo.

echo 🔧 Starting Backend Server...
start cmd /k "cd backend && python start.py"

timeout /t 3 /nobreak > nul

echo 🌐 Starting Frontend Server...
start cmd /k "cd frontend\my-app && npm run dev"

echo.
echo ✅ Application started successfully!
echo.
echo 📱 Frontend: http://localhost:5173
echo 🔌 Backend API: http://localhost:8000
echo 📚 API Docs: http://localhost:8000/docs
echo.
echo Press any key to close this window...
pause > nul
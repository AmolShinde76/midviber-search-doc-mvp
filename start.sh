#!/bin/bash

echo "============================================"
echo "  Medical Document Search Assistant"
echo "============================================"
echo

echo "🚀 Starting the application..."
echo

echo "📋 Prerequisites check:"
echo "- Make sure you have set your OpenAI API key in backend/.env"
echo "- Backend dependencies installed ✓"
echo "- Frontend dependencies installed ✓"
echo

echo "🔧 Starting Backend Server..."
cd backend && python start.py &
BACKEND_PID=$!

sleep 3

echo "🌐 Starting Frontend Server..."
cd ../frontend/my-app && npm run dev &
FRONTEND_PID=$!

echo
echo "✅ Application started successfully!"
echo
echo "📱 Frontend: http://localhost:5173"
echo "🔌 Backend API: http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo
echo "Press Ctrl+C to stop all services"

# Wait for user interrupt
trap "echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
#!/usr/bin/env python3
"""
Startup script for the Medical Document Assistant backend
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Check if API key is set
if not os.getenv('OPENAI_API_KEY') or os.getenv('OPENAI_API_KEY') == 'sk-your-actual-openai-api-key-here':
    print("ERROR: OPENAI_API_KEY environment variable is not set or using placeholder!")
    print("Please update your .env file with a valid OpenAI API key.")
    print("Get your API key from: https://platform.openai.com/api-keys")
    sys.exit(1)

# Import and run the FastAPI app
try:
    import uvicorn
    from api_server import app

    port = int(os.getenv('BACKEND_PORT', 8000))
    print(f"Starting Medical Document Assistant on port {port}")
    print("Press Ctrl+C to stop")
    print(f"API Documentation will be available at: http://localhost:{port}/docs")

    uvicorn.run(
        "api_server:app",
        host="127.0.0.1",
        port=port,
        reload=False,  # Disable reload to avoid multiprocessing issues
        log_level="info"
    )

except ImportError as e:
    print(f"Import error: {e}")
    print("Please install dependencies: pip install -r requirements.txt")
    sys.exit(1)
except Exception as e:
    print(f"Startup error: {e}")
    sys.exit(1)
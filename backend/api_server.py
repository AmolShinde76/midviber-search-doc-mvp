from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, validator
from search_context_simple import ask, client
import io
import os
import json
import logging
from dotenv import load_dotenv
from typing import List, Dict, Any

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Medical Document Assistant API", version="1.0.0")

# Get allowed origins from environment
allowed_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:5173').split(',')

# Add CORS middleware with restricted origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    question: str
    document_id: str

    @validator('question')
    def question_must_not_be_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Question cannot be empty')
        if len(v) > 2000:
            raise ValueError('Question too long (max 2000 characters)')
        return v.strip()

    @validator('document_id')
    def document_id_must_be_valid(cls, v):
        if not v or not v.strip():
            raise ValueError('Document ID cannot be empty')
        # Only allow alphanumeric characters, hyphens, and underscores
        import re
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError('Document ID contains invalid characters')
        return v.strip()
# Dummy journal data
journals = [
    {"id": "file-HKVYN4qp29bB6nCKh9fab5", "title": "Amlodipine", "desc": "Medical guidelines", "img":"./images/j21.jpg",
     "defaultDocumentQuestions": [
         {"id": "1", "Question": "What is the main indication or clinical use of the product?"},
         {"id": "2", "Question": "Are there any recent clinical studies supporting the product's efficacy?"},
         {"id": "3", "Question": "What are the primary advantages of this product over competitors?"},
         {"id": "4", "Question": "What is the recommended dosage, route, and duration for this medication?"},
         {"id": "5", "Question": "What are the most common side effects and safety warnings I should know about?"}
     ]},
    {"id": "file-N3jMSqG19Sc6pUB8a2C1sV", "title": "Ecosprin 75 Tablet", "desc": "Therapy titles for your e-reader", "img": "./images/j22.jpg",
    "defaultDocumentQuestions": [
         {"id": "1", "Question": "What is the main indication or clinical use of the product?"},
         {"id": "2", "Question": "Are there any recent clinical studies supporting the product's efficacy?"},
         {"id": "3", "Question": "What are the primary advantages of this product over competitors?"},
         {"id": "4", "Question": "What is the recommended dosage, route, and duration for this medication?"},
         {"id": "5", "Question": "What are the most common side effects and safety warnings I should know about?"}
     ]
    },    
    {"id": "file-KntFu9RZ8s4XUcmsGNE64W", "title": "Antimicrobial_Use_ Guidelines 2024", "desc": "Recent advances in medicine", "img": "./images/j23.png",
      "defaultDocumentQuestions": [
         {"id": "1", "Question": "What are the first-line antibiotics recommended for common bacterial infections in India?"},
         {"id": "2", "Question": "What are the diagnostic criteria and recommended management for acute rheumatic fever?"},
         {"id": "3", "Question": "What principles should be followed for starting empirical antibiotic treatment when the diagnosis is unclear?"},
         {"id": "4", "Question": "What are the protocols for antimicrobial prophylaxis in surgical procedures or specific diseases?"},
         {"id": "5", "Question": "How do the guidelines address the rational use of antimicrobials to combat antimicrobial resistance?"}
     ]},    
]

@app.get("/journals")
async def get_journals():
    # Return the first 5 journals
    return JSONResponse(content=journals[:5])

@app.post("/ask")
async def ask_question(request: QueryRequest):
    """Handle Q&A requests with streaming responses"""
    try:
        logger.info(f"Received question for document: {request.document_id}")

        def generate():
            try:
                for chunk in ask(request.question, request.document_id):
                    yield json.dumps(chunk) + "\n"
            except Exception as e:
                logger.error(f"Error in streaming response: {e}")
                error_chunk = {"type": "chunk", "content": f"Error: {str(e)}"}
                yield json.dumps(error_chunk) + "\n"
                end_chunk = {"type": "end", "references": [], "total_tokens": "N/A"}
                yield json.dumps(end_chunk) + "\n"

        return StreamingResponse(
            generate(),
            media_type="application/json",
            headers={"Cache-Control": "no-cache"}
        )
    except Exception as e:
        logger.error(f"Error processing ask request: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/pdf/{file_id}")
async def get_pdf(file_id: str):
    """Serve PDF files securely"""
    try:
        # Validate file_id to prevent path traversal
        import re
        if not re.match(r'^[a-zA-Z0-9_-]+$', file_id):
            raise HTTPException(status_code=400, detail="Invalid file ID")

        # Construct safe path
        documents_dir = os.path.join(os.getcwd(), "documents")
        file_path = os.path.join(documents_dir, f"{file_id}.pdf")

        # Ensure the file is within the documents directory
        if not os.path.abspath(file_path).startswith(os.path.abspath(documents_dir)):
            raise HTTPException(status_code=403, detail="Access denied")

        # Check if file exists
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"File not found: {file_id}.pdf")

        # Check file size (prevent large file downloads)
        file_size = os.path.getsize(file_path)
        if file_size > 50 * 1024 * 1024:  # 50MB limit
            raise HTTPException(status_code=413, detail="File too large")

        logger.info(f"Serving PDF: {file_id}.pdf ({file_size} bytes)")

        # Read and serve the PDF file
        def generate():
            try:
                with open(file_path, "rb") as f:
                    while chunk := f.read(8192):  # Read in 8KB chunks
                        yield chunk
            except Exception as e:
                logger.error(f"Error reading PDF file: {e}")
                raise

        return StreamingResponse(
            generate(),
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename={file_id}.pdf"}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error serving PDF: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {"status": "healthy", "service": "Medical Document Assistant API"}



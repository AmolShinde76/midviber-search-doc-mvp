from openai import OpenAI
import time
import os
import logging
from typing import Iterator, Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize client with environment variable
api_key = os.getenv('OPENAI_API_KEY')
if not api_key or api_key == 'sk-your-actual-openai-api-key-here':
    logger.warning("OPENAI_API_KEY not set or using placeholder. Please set a valid API key in .env file")
    client = None
else:
    try:
        # Initialize OpenAI client
        client = OpenAI(api_key=api_key)
        logger.info("OpenAI client initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize OpenAI client: {e}")
        client = None

# Thread-safe assistant management
_assistant_id = None
_assistant_lock = None

def get_assistant_id() -> str:
    """Get or create assistant ID in a thread-safe manner"""
    global _assistant_id
    if _assistant_id is None:
        try:
            # Create assistant with file_search tool (simplified approach)
            assistant = client.beta.assistants.create(
                name="Medical Document Assistant",
                instructions='''You are a medical document assistant. Answer questions based on the uploaded documents. Be concise and accurate. If the information is not in the document, say so. If the user greets you (e.g., "hi", "hello", "good morning"), respond with a friendly message before continuing with your assistant role.''',
                model="gpt-4o-mini",
                tools=[{"type": "file_search"}]
            )
            _assistant_id = assistant.id
            logger.info(f"Assistant created with file_search tool: {_assistant_id}")
        except Exception as e:
            logger.error(f"Failed to create assistant: {e}")
            raise
    return _assistant_id

def ask(question: str, document_id: str) -> Iterator[Dict[str, Any]]:
    """Stream responses from OpenAI Assistant for document Q&A"""
    start_time = time.time()
    logger.info(f"Starting request for document: {document_id}")

    try:
        # Get assistant ID (created once)
        assistant_id = get_assistant_id()

        # Create thread
        thread = client.beta.threads.create()
        logger.info(f"Thread created: {thread.id}")

        # Add message with file attachment
        client.beta.threads.messages.create(
            thread_id=thread.id,
            role="user",
            content=f"Answer this question based on the attached document: {question}",
            attachments=[{
                "file_id": document_id,
                "tools": [{"type": "file_search"}]
            }]
        )
        logger.info("Message added to thread")

        # Create and stream run
        stream = client.beta.threads.runs.create(
            thread_id=thread.id,
            assistant_id=assistant_id,
            stream=True,
            model="gpt-4o-mini"  # Ensure fast model
        )

        logger.info("Run started, streaming response")

        # Stream the response
        for event in stream:
            if event.event == 'thread.message.delta':
                if event.data.delta.content:
                    for content in event.data.delta.content:
                        if content.type == 'text':
                            # Clean up unwanted formatting from assistant response
                            text = content.text.value
                            # Remove citation-like formatting like 【4:0†source】
                            import re
                            text = re.sub(r'【[^】]*】', '', text)
                            text = re.sub(r'†source', '', text)
                            text = re.sub(r'\[\d+:\d+.*?\]', '', text)
                            if text.strip():  # Only yield non-empty content
                                yield {"type": "chunk", "content": text}
            elif event.event == 'thread.run.completed':
                logger.info(f"Completed in {time.time() - start_time:.2f}s")
                yield {"type": "end", "references": [], "total_tokens": "N/A"}
            elif event.event == 'thread.run.failed':
                error_msg = f"Assistant run failed: {event.data.last_error}"
                logger.error(error_msg)
                yield {"type": "chunk", "content": f"Error: {error_msg}"}
                yield {"type": "end", "references": [], "total_tokens": "N/A"}

    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        yield {"type": "chunk", "content": f"An unexpected error occurred: {str(e)}"}
        yield {"type": "end", "references": [], "total_tokens": "N/A"}
from openai import OpenAI
import time
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# 🔹 Initialize client
api_key = os.getenv('OPENAI_API_KEY')
if not api_key:
    raise ValueError("OPENAI_API_KEY environment variable is required")

client = OpenAI(api_key=api_key)

# Create Assistant with optimized settings
assistant = client.beta.assistants.create(
    model="gpt-4o-mini",
    instructions="You are a medical document assistant. Answer questions based ONLY on the attached document content. Be concise, accurate, and include page references when available. Do not make up information. Keep answers brief and to the point.",
    tools=[{"type": "file_search"}],
    temperature=0.1
)

# Create a thread
thread = client.beta.threads.create()

def ask(question, document_id):
    import time
    start_time = time.time()

    print(f"Starting request... ({time.time() - start_time:.2f}s)")
    print(f"Document ID: {document_id}")
    print(f"Thread ID: {thread.id}")
    print(f"Assistant ID: {assistant.id}")

    try:
        # Attach only the selected file for search
        attachments = [
            {"file_id": document_id, "tools": [{"type": "file_search"}]}
        ]

        print(f"Creating message... ({time.time() - start_time:.2f}s)")
        message_response = client.beta.threads.messages.create(
            thread_id=thread.id,
            role="user",
            content=question,
            attachments=attachments
        )
        print(f"Message created: {message_response.id} ({time.time() - start_time:.2f}s)")

        print(f"Starting assistant run... ({time.time() - start_time:.2f}s)")
        # Run assistant with streaming and optimized parameters
        run = client.beta.threads.runs.create(
            thread_id=thread.id,
            assistant_id=assistant.id,
            stream=True,
            temperature=0.1,
            max_tokens=500  # Limit tokens for faster response
        )
        print(f"Run started: {run.id if hasattr(run, 'id') else 'streaming'} ({time.time() - start_time:.2f}s)")
        
        full_answer = ""
        file_refs = []

        print(f"Streaming response... ({time.time() - start_time:.2f}s)")
        # Stream the response
        for event in run:
            if event.event == "thread.message.delta":
                for delta in event.data.delta.content:
                    if delta.type == "text":
                        text = delta.text.value
                        full_answer += text
                        yield {"type": "chunk", "content": text}
            elif event.event == "thread.message.completed":
                print(f"Message completed... ({time.time() - start_time:.2f}s)")
                # Get the full message for annotations
                messages = client.beta.threads.messages.list(thread_id=thread.id)
                answer_content = messages.data[0].content[0]

                # Extract file references from annotations (if any)
                if hasattr(answer_content.text, "annotations"):
                    for ann in answer_content.text.annotations:
                        if hasattr(ann, "file_citation") and hasattr(ann.file_citation, "file_id"):
                            file_id = ann.file_citation.file_id
                            try:
                                # Get file information to include filename
                                file_info = client.files.retrieve(file_id)
                                file_refs.append({
                                    "id": file_id,
                                    "name": file_info.filename
                                })
                            except Exception as e:
                                # If we can't get file info, just include the ID
                                file_refs.append({
                                    "id": file_id,
                                    "name": f"File {file_id}"
                                })
            elif event.event == "thread.run.completed":
                print(f"Run completed... ({time.time() - start_time:.2f}s)")
                # Token usage
                usage = event.data.usage
                total_tokens = usage.total_tokens if usage else "N/A"

                yield {"type": "end", "references": file_refs, "total_tokens": total_tokens}
                break

    except Exception as e:
        print(f"Error in ask function: {str(e)}")
        import traceback
        traceback.print_exc()
        yield {"type": "chunk", "content": f"Error: {str(e)}"}
        yield {"type": "end", "references": [], "total_tokens": "N/A"}
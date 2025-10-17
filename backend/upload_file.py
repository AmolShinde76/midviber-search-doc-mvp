from openai import OpenAI
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set your API key from environment
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))




def upload_file():
    file = client.files.create(
    file=open(r"e:\mvp-project\backend\documents\Antimicrobial_Use_ Guidelines 2024.pdf", "rb"),
    purpose="assistants"  
    )
    print("File ID:", file.id)



def fileStatus(file_id:str):
    # Retrieve file details
    file_status = client.files.retrieve(file_id)

    print("File ID:", file_status.id)
    print("Filename:", file_status.filename)
    print("Purpose:", file_status.purpose)
    print("Status:", file_status.status)   # usually "uploaded" or "processed"
    print("Bytes:", file_status.bytes)

fileStatus(file_id="file-HKVYN4qp29bB6nCKh9fab5")
from openai import OpenAI
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Set your API key from environment
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

response = client.chat.completions.create(
    model="gpt-4o-mini",  # or "gpt-4o" if you want GPT-4
    messages=[
        {"role": "user", "content": "What is the capital of France?"}
    ]
)

print(f"tokens = {response.usage.total_tokens}")
print(f"Answer = {response.choices[0].message.content}")

import google.generativeai as genai
import os
import json
import asyncio
from dotenv import load_dotenv

load_dotenv()
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

async def test_extraction():
    model = genai.GenerativeModel("gemini-3-flash-preview", generation_config={"response_mime_type": "application/json"})
    prompt = """
    Read the following story and list every person, divine figure, or named entity that plays a role.
    Story: Once upon a time in ancient India, King Vikramaditya was walking through the forest when he met a talking parrot named Shuka.
    IMPORTANT: You must return a VALID JSON object with a single key 'characters' containing an array of strings.
    Example: {"characters": ["Arjun", "Karna", "Krishna"]}
    """
    try:
        response = await model.generate_content_async(prompt)
        print(f"Raw Response: {response.text}")
        data = json.loads(response.text)
        print(f"Parsed Data: {data}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_extraction())

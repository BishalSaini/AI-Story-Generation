import httpx
import json
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

async def test_image_generation():
    api_key = os.getenv("OPENROUTER_API_KEY")
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://vishwastory.ai",
        "X-Title": "VishwaHistory AI",
    }

    # Try different payload formats
    payloads_to_test = [
        {
            "name": "Chat format with modalities",
            "payload": {
                "model": "black-forest-labs/flux.2-klein-4b",
                "messages": [
                    {
                        "role": "user",
                        "content": "Generate a beautiful historical Indian fort with stone walls and traditional architecture"
                    }
                ],
                "modalities": ["image", "text"]
            }
        },
        {
            "name": "Simple prompt format",
            "payload": {
                "model": "black-forest-labs/flux.2-klein-4b",
                "prompt": "Generate a beautiful historical Indian fort with stone walls and traditional architecture"
            }
        },
        {
            "name": "Chat format without modalities",
            "payload": {
                "model": "black-forest-labs/flux.2-klein-4b",
                "messages": [
                    {
                        "role": "user",
                        "content": "Generate a beautiful historical Indian fort with stone walls and traditional architecture"
                    }
                ]
            }
        }
    ]

    for test in payloads_to_test:
        print(f"\n{'='*60}")
        print(f"Testing: {test['name']}")
        print(f"{'='*60}")
        payload = test['payload']

    for test in payloads_to_test:
        print(f"\n{'='*60}")
        print(f"Testing: {test['name']}")
        print(f"{'='*60}")
        payload = test['payload']

        try:
            async with httpx.AsyncClient() as client:
                print("Sending request to OpenRouter...")
                response = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=120.0
                )
                
                print(f"\nStatus Code: {response.status_code}")
                
                if response.status_code != 200:
                    print(f"\nError Response: {response.text}")
                    continue
                
                result = response.json()
                print(f"\n=== SUCCESS! ===")
                print(json.dumps(result, indent=2)[:1000])
                
                if result.get("choices"):
                    message = result["choices"][0]["message"]
                    print(f"\nMessage keys: {list(message.keys())}")
                    
                    if message.get("content"):
                        content = message.get("content", "")
                        if "data:image" in str(content):
                            print("\n✓ IMAGE DATA FOUND IN CONTENT!")
                            print(f"Content preview: {str(content)[:200]}")
                    
                    if message.get("images"):
                        print(f"\n✓ IMAGES ARRAY FOUND: {len(message['images'])} images")
                
                break  # Success, no need to test other formats

        except Exception as e:
            print(f"\nException: {e}")

if __name__ == "__main__":
    asyncio.run(test_image_generation())

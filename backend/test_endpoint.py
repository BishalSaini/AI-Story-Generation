import httpx
import json
import asyncio

async def test_story_generation():
    url = "http://localhost:8000/api/generate"
    
    payload = {
        "clerkId": "test_user",
        "email": "test@example.com",
        "topic": "Chhatrapati Shivaji Maharaj",
        "era": "Medieval",
        "style": "Narrative"
    }
    
    print("Sending request to backend...")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(url, json=payload)
            
            print(f"\nStatus Code: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"\n=== SUCCESS ===")
                print(f"Story Title: {result['story']['title']}")
                print(f"Story Content Length: {len(result['story']['content'])} characters")
                print(f"\nImages Generated: {len(result['images'])}")
                
                for i, img in enumerate(result['images']):
                    print(f"\nImage {i+1}:")
                    print(f"  Prompt: {img['prompt'][:100]}...")
                    print(f"  URL type: {'Base64 Data URL' if img['url'].startswith('data:image') else 'Regular URL'}")
                    if img['url'].startswith('data:image'):
                        print(f"  URL length: {len(img['url'])} characters")
                        print(f"  URL preview: {img['url'][:80]}...")
                    else:
                        print(f"  URL: {img['url']}")
            else:
                print(f"\n=== ERROR ===")
                print(f"Response: {response.text}")
                
    except Exception as e:
        print(f"\nException: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_story_generation())

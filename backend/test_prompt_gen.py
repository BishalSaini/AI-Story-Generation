
import asyncio
from app.services.gemini_service import generate_image_prompts
import logging

logging.basicConfig(level=logging.INFO)

async def test():
    print("Testing image prompt generation...")
    story_text = "This is a story about a brave knight in a medieval castle."
    result = await generate_image_prompts(story_text, topic="Knight", era="Medieval", story_type="Historical")
    print(f"Result: {result}")

if __name__ == "__main__":
    asyncio.run(test())

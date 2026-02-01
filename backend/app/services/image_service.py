import httpx
from app.core.config import settings
import logging
import json
import asyncio

logger = logging.getLogger(__name__)

async def generate_image(prompt: str, negative_prompt: str = "", retry_count: int = 0):
    if not settings.OPENROUTER_API_KEY:
        logger.warning("OPENROUTER_API_KEY not set. Returning placeholder.")
        return "https://placehold.co/600x400?text=No+API+Key+For+Image"

    # Flux 2 Pro works best with natural language prompts
    full_prompt = f"{prompt}"
    if negative_prompt:
        full_prompt += f" [Avoid: {negative_prompt}]"

    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://vishwastory.ai",
        "X-Title": "VishwaHistory AI",
    }

    # OpenRouter FLUX image generation - simpler format
    payload = {
        "model": "black-forest-labs/flux.2-klein-4b",
        "messages": [
            {
                "role": "user",
                "content": full_prompt
            }
        ]
        # Note: Do NOT include "modalities" parameter - it causes 404 error
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=90.0  # Image generation can take time
            )
            
            if response.status_code == 404:
                logger.error(f"OpenRouter 404 Error - Model might be unavailable: {response.text}")
                # Retry with exponential backoff (max 2 retries)
                if retry_count < 2:
                    wait_time = (retry_count + 1) * 2  # 2s, 4s
                    logger.info(f"Retrying after {wait_time}s... (attempt {retry_count + 1}/2)")
                    await asyncio.sleep(wait_time)
                    return await generate_image(prompt, negative_prompt, retry_count + 1)
                return f"https://placehold.co/600x400?text=Model+Unavailable"
            
            if response.status_code != 200:
                logger.error(f"OpenRouter API Error: {response.status_code} - {response.text}")
                return f"https://placehold.co/600x400?text=Error+{response.status_code}"
            
            result = response.json()
            logger.info(f"OpenRouter Response Structure: {json.dumps(result, indent=2)[:500]}")
            
            # According to OpenRouter docs: "The generated images are returned as 
            # base64-encoded data URLs in the assistant message"
            # Structure: choices[0].message.content (might contain data URL)
            # OR choices[0].message.images array
            
            if result.get("choices") and len(result["choices"]) > 0:
                message = result["choices"][0]["message"]
                logger.info(f"Message keys: {message.keys()}")
                logger.info(f"Message content: {message.get('content', 'NO CONTENT')[:200]}")
                logger.info(f"Message images: {message.get('images', 'NO IMAGES')}")
                
                # Method 1: Check for images array (documented format)
                if message.get("images") and len(message["images"]) > 0:
                    image_data = message["images"][0]
                    logger.info(f"Found image data: {type(image_data)}")
                    if isinstance(image_data, dict) and "image_url" in image_data:
                        image_url = image_data["image_url"]["url"]
                        logger.info(f"Returning image URL (length: {len(image_url)})")
                        return image_url
                    elif isinstance(image_data, str):
                        logger.info(f"Returning direct image string (length: {len(image_data)})")
                        return image_data
                
                # Method 2: Check content field for base64 data URL
                content = message.get("content", "")
                if content and content.startswith("data:image"):
                    return content
                
                # Method 3: Parse content for embedded image URL
                if "data:image" in content:
                    # Extract data URL from content
                    import re
                    match = re.search(r'(data:image/[^;]+;base64,[^\s\)\\"]+)', content)
                    if match:
                        return match.group(1)

            logger.error(f"Unexpected response format. Full response: {result}")
            return "https://placehold.co/600x400?text=Format+Error"

    except Exception as e:
        logger.error(f"Image Gen Exception: {e}")
        return "https://placehold.co/600x400?text=System+Error"

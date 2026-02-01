from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import json
from app.services.gemini_service import generate_story, generate_image_prompts
from app.services.image_service import generate_image
import asyncio

router = APIRouter()

class StoryRequest(BaseModel):
    clerkId: str # Retained for potential logging/context but unused for logic now
    email: str
    topic: str
    era: str
    style: str
    storyType: str = "Historical"

# Stateless Generation Endpoint
@router.post("/generate")
async def create_story(request: StoryRequest):
    # 1. Generate Story text
    story_data = await generate_story(request.topic, request.era, request.style, request.storyType)
    if not story_data or "error" in story_data:
        raise HTTPException(status_code=500, detail=f"AI Story Generation failed: {story_data.get('error') if story_data else 'Unknown Error'}")

    # 2. Extract/Generate Visual Prompts
    prompts_data = await generate_image_prompts(
        story_data.get("story_content", ""),
        topic=request.topic,
        era=request.era,
        story_type=request.storyType
    )
    image_prompts = prompts_data.get("image_prompts", [])
    if not image_prompts:
        image_prompts = []

    # 3. Generate Images (Sequential with delay to avoid rate limiting)
    image_urls = []
    # Limit to 2 images for efficiency
    for i, p in enumerate(image_prompts[:2]):
        desc = p.get("scene_description", "")
        neg = p.get("negative_prompt", "")
        
        # Add delay between requests to avoid rate limiting (except for first image)
        if i > 0:
            await asyncio.sleep(3)  # 3 second delay between requests
        
        url = await generate_image(desc, neg)
        image_urls.append(url)


    generated_images = []
    for i, url in enumerate(image_urls):
        generated_images.append({
            "url": url,
            "prompt": image_prompts[i].get("scene_description", "Unknown"),
            "category": "Generated"
        })

    # Return pure JSON. Persistence is now handled by the Frontend (Next.js).
    return {
        "story": {
            "title": story_data.get("title", "Untitled"),
            "content": story_data.get("story_content", ""),
            "moral": story_data.get("moral", ""),
            "timeline": story_data.get("timeline", []),
            "events": story_data.get("main_events_summary", []),
            "topic": request.topic,
            "era": request.era,
            "style": request.style
        },
        "images": generated_images
    }

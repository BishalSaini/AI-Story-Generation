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
    withImages: bool = True
    language: str = "English"

# Stateless Generation Endpoint
@router.post("/generate")
async def create_story(request: StoryRequest):
    # 1. Generate Story text
    story_data = await generate_story(request.topic, request.era, request.style, request.storyType, request.language)
    if not story_data or "error" in story_data:
        raise HTTPException(status_code=500, detail=f"AI Story Generation failed: {story_data.get('error') if story_data else 'Unknown Error'}")

    generated_images = []
    
    # 2. Extract/Generate Visual Prompts (Only if withImages is True)
    if request.withImages:
        prompts_data = await generate_image_prompts(
            story_data.get("story_content", ""),
            topic=request.topic,
            era=request.era,
            story_type=request.storyType
        )
        image_prompts = prompts_data.get("image_prompts", [])
        if not image_prompts:
            print("Warning: No image prompts generated. Using fallback.")
            image_prompts = [{
                "scene_description": f"Historical scene representing {request.topic} during the {request.era}, atmospheric, detailed, wide shot",
                "negative_prompt": "text, watermark, distorted, realistic faces"
            }]

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

from app.services.audio_service import generate_story_audio

class AudioRequest(BaseModel):
    text: str
    storyType: str = "Historical"

@router.post("/generate-audio")
async def create_audio(request: AudioRequest):
    result = await generate_story_audio(request.text, request.storyType)
    if not result:
        raise HTTPException(status_code=500, detail="Audio generation failed")
    
    # Return both audio URL and alignment data
    return {
        "audioUrl": result["audioUrl"],
        "alignment": result["alignment"]
    }

from app.services.gemini_service import extract_characters, generate_character_chat_response

class ExtractCharsRequest(BaseModel):
    text: str

@router.post("/extract-characters")
async def extract_chars(request: ExtractCharsRequest):
    result = await extract_characters(request.text)
    return result

class ChatRequest(BaseModel):
    story_context: str
    character_name: str
    history: List[dict] # [{"role": "user", "content": "..."}]
    message: str

@router.post("/chat")
async def chat_with_character(request: ChatRequest):
    result = await generate_character_chat_response(
        request.story_context,
        request.character_name,
        request.history,
        request.message
    )
    return result

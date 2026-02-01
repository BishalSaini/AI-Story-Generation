import google.generativeai as genai
from app.core.config import settings
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

# Generation Config
generation_config = {
    "temperature": 0.7,
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 8192,
    "response_mime_type": "application/json",
}

model = genai.GenerativeModel(
    model_name="gemini-2.5-flash",
    generation_config={
        "temperature": 0.7,
        "top_p": 0.95,
        "top_k": 40,
        "max_output_tokens": 8192,
        "response_mime_type": "application/json",
    },
    system_instruction="""You are a versatile storytelling AI capable of generating both historical and creative fictional content.
You can adapt your approach based on the task:
- For historical stories: Use accurate facts and historical knowledge
- For creative stories: Use imagination and creativity to craft engaging narratives
- For hybrid stories: Blend historical facts with creative storytelling

You must ALWAYS output VALID JSON in this structure:
{
  "title": "Story Title",
  "era": "Era Name",
  "timeline": [{"date": "...", "event": "..."}],
  "main_events_summary": ["event 1", "event 2"],
  "story_content": "Full story text...",
  "moral": "Moral of the story"
}

Follow the specific instructions provided in each prompt carefully.
"""
)


image_prompt_model = genai.GenerativeModel(
    model_name="gemini-2.5-flash",
    generation_config={"response_mime_type": "application/json"},
    system_instruction="""You are an expert AI art director for historical visualizations.
    Your goal is to convert story events into SAFE, SCENE-BASED image prompts.
    CRITICAL RULES:
    1. NO realistic faces of historical figures.
    2. Focus on Architecture, Forts, Battlefields (long shots), Maps, Symbolic elements (flags, weapons).
    3. Output a list of props/scenes.
    Format: {"image_prompts": [{"scene_description": "...", "negative_prompt": "..."}]}
    """
)

async def generate_story(topic: str, era: str, style: str, story_type: str = "Historical"):
    # Adapt the prompt based on story type
    if story_type == "Creative":
        prompt = f"""
        You are a creative storytelling AI with unlimited imagination.
        
        Task: Create an engaging, imaginative story about {topic} set in the {era} era/setting.
        Writing Style: {style}
        
        Instructions:
        1. Let your creativity flow - this is a fictional/imaginative story
        2. Create compelling characters, vivid settings, and exciting plot developments
        3. You can include fantasy elements, sci-fi concepts, or any creative ideas
        4. Write in {style} style, making it captivating and entertaining
        5. Include world-building details appropriate to the {era} setting
        6. Create a narrative arc with beginning, middle, and end
        7. Create a detailed timeline with at least 4-5 key story moments/events
        8. Conclude with a meaningful moral or lesson from the story
        
        Required Output Format (MUST be valid JSON):
        {{
          "title": "An engaging title for the story",
          "era": "{era}",
          "timeline": [
            {{"date": "Beginning", "event": "Opening scene description"}},
            {{"date": "Early Adventure", "event": "First major event"}},
            {{"date": "Mid Journey", "event": "Conflict or challenge"}},
            {{"date": "Climax", "event": "Peak moment of the story"}},
            {{"date": "Resolution", "event": "How the story concludes"}}
          ],
          "main_events_summary": ["Key plot point 1", "Key plot point 2", "Key plot point 3", "Key plot point 4"],
          "story_content": "Full creative narrative written in {style} style. Make it imaginative, engaging, and entertaining with vivid descriptions.",
          "moral": "The key lesson or message of this story"
        }}
        
        Begin generating the creative story now.
        """
    elif story_type == "Hybrid":
        prompt = f"""
        You are a creative historical storytelling AI.
        
        Task: Create a story about {topic} during the {era} era that blends historical facts with creative storytelling.
        Writing Style: {style}
        
        Instructions:
        1. Use real historical context and settings from the {era} era
        2. You may add fictional characters or creative elements to enhance the narrative
        3. Maintain historical accuracy for major events and settings
        4. Add imaginative details to make the story more engaging
        5. Write in {style} style, balancing education with entertainment
        6. Include both factual historical elements and creative storytelling
        7. Conclude with a meaningful moral or lesson
        
        Required Output Format (MUST be valid JSON):
        {{
          "title": "An engaging title for the story",
          "era": "{era}",
          "timeline": [
            {{"date": "YYYY or story point", "event": "What happened"}},
            {{"date": "YYYY or story point", "event": "What happened"}}
          ],
          "main_events_summary": ["Key event 1", "Key event 2", "Key event 3"],
          "story_content": "Full narrative blending historical facts with creative storytelling, written in {style} style.",
          "moral": "The key lesson from this narrative"
        }}
        
        Begin generating the hybrid story now.
        """
    else:  # Historical (default)
        prompt = f"""
        You are a historical storytelling AI with access to comprehensive historical knowledge.
        
        Task: Create a detailed, factual, and engaging story about {topic} during the {era} era.
        Writing Style: {style}
        
        Instructions:
        1. Use your extensive knowledge base to research and include accurate historical facts about {topic}
        2. Include specific dates, locations, key events, and historical figures related to this topic
        3. Present events in chronological order with clear timeline markers
        4. Write in {style} style, making it engaging while maintaining historical accuracy
        5. Include cultural, political, and social context of the {era} era
        6. Highlight the significance and impact of the events
        7. Conclude with a meaningful moral or lesson from this historical narrative
        
        Required Output Format (MUST be valid JSON):
        {{
          "title": "An engaging title for the story",
          "era": "{era}",
          "timeline": [
            {{"date": "YYYY or specific date", "event": "Brief description of what happened"}},
            {{"date": "YYYY or specific date", "event": "Brief description of what happened"}}
          ],
          "main_events_summary": ["Key event 1", "Key event 2", "Key event 3"],
          "story_content": "Full narrative story with rich historical details, written in {style} style. Include specific facts, dates, places, and people. Make it engaging and educational.",
          "moral": "The key lesson or significance of this historical narrative"
        }}
        
        Begin generating the story now using your historical knowledge.
        """
    
    try:
        response = await model.generate_content_async(prompt)
        return json.loads(response.text)
    except Exception as e:
        logger.error(f"Error generating story: {e}")
        # Return error as dictionary to bubble up detail
        return {"error": str(e)}


async def generate_image_prompts(story_text: str, topic: str = "", era: str = "", story_type: str = "Historical"):
    if story_type == "Creative":
        prompt = f"""
        Based on this creative/imaginative story, create 3-4 distinct visual prompts for illustration.
        
        STORY TOPIC: {topic}
        SETTING: {era}
        STORY EXCERPT: {story_text[:4000]}
        
        CRITICAL RULES FOR IMAGE GENERATION:
        1. NO realistic human faces or close-up portraits
        2. Focus on:
           - Fantasy/sci-fi environments and landscapes
           - Magical or futuristic architecture
           - Creatures, objects, and symbolic elements from the story
           - Atmospheric scenes that capture the mood
           - Wide shots of settings and locations
           - Creative visual elements that match the story theme
        3. Use artistic styles like: fantasy art, concept art, illustration, digital painting
        4. Avoid: realistic human faces, portraits, text overlays, watermarks
        
        For each scene, provide:
        - scene_description: A detailed, vivid description of what to visualize (be specific about the creative elements, mood, and style)
        - negative_prompt: What to avoid (always include: "realistic human faces, portraits, text, watermark")
        
        Output Format (MUST be valid JSON):
        {{
          "image_prompts": [
            {{
              "scene_description": "Detailed description of the creative scene",
              "negative_prompt": "realistic human faces, portraits, text, watermark, photorealistic people"
            }}
          ]
        }}
        
        Generate prompts that are imaginative and visually compelling for this {era} setting and {topic} theme.
        """
    else:  # Historical or Hybrid
        prompt = f"""
        Based on this story, create 3-4 distinct visual prompts for illustration.
        
        STORY TOPIC: {topic}
        ERA: {era}
        STORY EXCERPT: {story_text[:4000]}
        
        CRITICAL RULES FOR IMAGE GENERATION:
        1. NO realistic faces of historical figures or people
        2. Focus on:
           - Architecture and landmarks relevant to the story
           - Battlefields, landscapes, or significant locations (wide/aerial shots)
           - Maps showing territories or movements
           - Symbolic elements (flags, weapons, artifacts, clothing)
           - Cultural objects and period-appropriate items
           - Atmospheric scenes that capture the era
        3. Use artistic styles like: historical painting, illustration, concept art
        4. Avoid: modern objects, text overlays, watermarks, close-up portraits
        
        For each scene, provide:
        - scene_description: A detailed, vivid description of what to visualize (be specific about architecture style, time period, cultural elements)
        - negative_prompt: What to avoid (always include: "modern clothes, realistic human faces, portraits, text, watermark")
        
        Output Format (MUST be valid JSON):
        {{
          "image_prompts": [
            {{
              "scene_description": "Detailed description of the scene with period-specific details",
              "negative_prompt": "modern clothes, realistic human faces, portraits, text, watermark, anachronisms"
            }}
          ]
        }}
        
        Generate prompts that are visually compelling for the {era} era and {topic} topic.
        """
    try:
        response = await image_prompt_model.generate_content_async(prompt)
        return json.loads(response.text)
    except Exception as e:
        logger.error(f"Error generating image prompts: {e}")
        return {"image_prompts": []}

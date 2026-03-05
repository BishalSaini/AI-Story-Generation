from groq import Groq
from app.core.config import settings
import json
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Debug: Check what we're getting
logger.info(f"🔍 GROQ_API_KEY from settings: {settings.GROQ_API_KEY[:20] if settings.GROQ_API_KEY else 'NONE'}...")
logger.info(f"🔍 GROQ_API_KEY from env: {os.getenv('GROQ_API_KEY', 'NONE')[:20]}...")

# Initialize Groq client only if API key is provided and not empty
client = None
groq_key = settings.GROQ_API_KEY or os.getenv('GROQ_API_KEY', '')

if groq_key and len(groq_key.strip()) > 0:
    try:
        client = Groq(api_key=groq_key.strip())
        logger.info("✅ Groq client initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize Groq client: {e}")
        client = None
else:
    logger.warning("⚠️ GROQ_API_KEY not set - Groq service unavailable")


async def generate_story_groq(topic: str, era: str, style: str, story_type: str = "Historical", language: str = "English"):
    """
    Generate story using Groq's ultra-fast inference with Llama 3.3 70B
    Much faster than Gemini while maintaining quality
    """
    if not client:
        logger.error("Groq client not initialized - missing API key")
        return {"error": "Groq API not configured"}

    # Language Instruction
    lang_instruction = f"Output the story content, title, and moral entirely in {language} language. Keep JSON keys in English."

    # Adapt prompt based on story type
    if story_type == "Creative":
        system_prompt = f"""You are a creative storytelling AI with unlimited imagination.
{lang_instruction}

Create an engaging, imaginative story about the given topic.
Output ONLY valid JSON in this exact structure (no markdown, no extra text):
{{
  "title": "Story Title",
  "era": "Era Name",
  "main_events_summary": ["event 1", "event 2"],
  "story_content": "Full story text with \\n\\n between paragraphs",
  "moral": "Moral of the story"
}}"""

        user_prompt = f"""Create an engaging, imaginative story:
- Topic: {topic}
- Era/Setting: {era}
- Style: {style}

Requirements:
1. Let creativity flow - this is fictional/imaginative
2. Create compelling characters, vivid settings, exciting plot
3. Write in {style} style
4. Include world-building details for {era}
5. Create narrative arc (beginning, middle, end)
6. Do NOT include any timeline - this is a fictional story
7. **LENGTH**: Write 3-4 rich, well-developed paragraphs (800-1000 words). Use **bold** for key names. Separate paragraphs with \\n\\n.
8. Meaningful moral/lesson

Output ONLY the JSON object."""

    elif story_type == "Hybrid":
        system_prompt = f"""You are a creative historical storytelling AI.
{lang_instruction}

Blend historical facts with creative storytelling.
Output ONLY valid JSON (no markdown)."""

        user_prompt = f"""Create a story blending history with creativity:
- Topic: {topic}
- Era: {era}
- Style: {style}

Requirements:
1. Real historical context from {era}
2. May add fictional characters for engagement
3. Maintain accuracy for major events/settings
4. Write in {style} style
5. **LENGTH**: 3-4 rich, well-developed paragraphs (800-1000 words). Use **bold** for historical figures. Separate with \\n\\n.
6. Meaningful moral/lesson

Output ONLY the JSON object."""

    elif story_type == "Mythology":
        system_prompt = f"""You are an expert in world mythology and folklore.
{lang_instruction}

Tell legendary stories with cultural significance.
Do NOT include any timeline. Output ONLY valid JSON (no markdown)."""

        user_prompt = f"""Tell the myth/legend:
- Topic: {topic}
- Era/Context: {era}
- Style: {style}

Requirements:
1. Cultural significance and symbolism
2. Mystical yet educational tone
3. Modern relevance/moral
4. Do NOT include any timeline - this is a mythological story
5. **LENGTH**: 3-4 rich, well-developed paragraphs (800-1000 words). Explore mythological world and symbolism deeply.

Output ONLY the JSON object."""

    elif story_type == "SciFi":
        system_prompt = f"""You are a Science Fiction visionary.
{lang_instruction}

Create futuristic/sci-fi stories.
Do NOT include any timeline. Output ONLY valid JSON (no markdown)."""

        user_prompt = f"""Create sci-fi story:
- Topic: {topic}
- Era: {era}
- Style: {style}

Requirements:
1. Advanced technology, space, or futuristic society
2. Compelling narrative with conflict
3. Vivid world-building
4. Do NOT include any timeline - this is a fictional story
5. **LENGTH**: 3-4 rich, well-developed paragraphs (800-1000 words). Rich world-building and character development.

Output ONLY the JSON object."""

    elif story_type == "Mystery":
        system_prompt = f"""You are a Master Detective storyteller.
{lang_instruction}

Create gripping mysteries.
Do NOT include any timeline. Output ONLY valid JSON (no markdown)."""

        user_prompt = f"""Create mystery story:
- Topic: {topic}
- Era: {era}
- Style: {style}

Requirements:
1. Central mystery/crime early
2. Clues, red herrings, suspects
3. Build suspense
4. Satisfying climax reveal
5. Do NOT include any timeline - this is a fictional story
6. **LENGTH**: 3-4 rich, well-developed paragraphs (800-1000 words). Include clues and deductions.

Output ONLY the JSON object."""

    elif story_type == "TimeTravel":
        system_prompt = f"""You are a Sci-Fi Historical guide.
{lang_instruction}

Describe time travel experiences.
Do NOT include any timeline. Output ONLY valid JSON (no markdown)."""

        user_prompt = f"""Time travel story:
- Topic: {topic}
- Era: {era}
- Style: {style}

Requirements:
1. Modern perspective vs historical reality
2. Sensory details (smell, sight, sound)
3. Technology/culture differences
4. Do NOT include any timeline - this is a fictional story
5. **LENGTH**: 3-4 rich, well-developed paragraphs (800-1000 words). Detailed observations and reflections.

Output ONLY the JSON object."""

    elif story_type == "AltHistory":
        system_prompt = f"""You are an Alternative History specialist.
{lang_instruction}

Create 'What If?' scenarios.
Output ONLY valid JSON (no markdown)."""

        user_prompt = f"""Alternative history:
- Topic: {topic}
- Era: {era}
- Style: {style}

Requirements:
1. Real historical divergence point
2. Logical consequences
3. Thought-provoking but grounded
4. **LENGTH**: 3-4 rich, well-developed paragraphs (800-1000 words). Detail the shifted world.

Output ONLY the JSON object."""

    else:  # Historical (default)
        system_prompt = f"""You are a historical storytelling AI with deep knowledge of world history.
{lang_instruction}

Create historically accurate and engaging narratives.
Output ONLY valid JSON in this exact structure:
{{
  "title": "Story Title",
  "era": "Era Name",
  "timeline": [{{"date": "...", "event": "..."}}],
  "main_events_summary": ["event 1", "event 2", "event 3"],
  "story_content": "Full story with \\n\\n between paragraphs",
  "moral": "Moral/lesson"
}}"""

        user_prompt = f"""Create a historical story:
- Topic: {topic}
- Era: {era}
- Style: {style}

Requirements:
1. Historically accurate facts and context
2. Write in {style} style (narrative/documentary/poetic)
3. Include timeline with key dates/events
4. Main events summary (3-5 key points)
5. **LENGTH**: Write 3-4 rich, well-developed paragraphs (800-1000 words). Use **bold** for important names/dates. Separate paragraphs with \\n\\n for readability.
6. Conclude with meaningful moral/lesson

Output ONLY the JSON object - no markdown formatting."""

    try:
        # Use Groq's ultra-fast Llama 3.3 70B model
        logger.info(f"🚀 Generating {story_type} story with Groq (topic: {topic})")
        
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",  # Fast and high-quality
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=8192,
            top_p=0.95,
            response_format={"type": "json_object"}  # Ensures JSON output
        )
        
        result_text = response.choices[0].message.content
        logger.info(f"✅ Groq generation completed in {response.usage.total_time if hasattr(response, 'usage') else 'N/A'}s")
        
        # Parse JSON
        story_data = json.loads(result_text)
        
        # Validate required fields
        required_fields = ["title", "story_content", "moral"]
        for field in required_fields:
            if field not in story_data:
                logger.warning(f"Missing field: {field}")
                story_data[field] = f"[{field} not generated]"
        
        # Ensure optional fields exist
        if "timeline" not in story_data:
            story_data["timeline"] = []
        if "main_events_summary" not in story_data:
            story_data["main_events_summary"] = []
        if "era" not in story_data:
            story_data["era"] = era
            
        return story_data
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing error: {e}")
        logger.error(f"Response text: {result_text[:500]}")
        return {"error": f"Failed to parse AI response: {str(e)}"}
    except Exception as e:
        logger.error(f"Groq generation error: {e}")
        return {"error": str(e)}


async def generate_image_prompts_groq(story_text: str, topic: str = "", era: str = "", story_type: str = "Historical"):
    """Generate image prompts from story using Groq"""
    if not client:
        return {"image_prompts": []}
    
    style_instruct = "historical painting, illustration, concept art"
    if story_type == "SciFi":
        style_instruct = "futuristic concept art, sci-fi illustration, cyberpunk"
    elif story_type == "Mythology":
        style_instruct = "epic fantasy art, ethereal and mystical"
    elif story_type == "Mystery":
        style_instruct = "film noir, moody illustration, suspenseful"

    system_prompt = """You are an expert AI art director.
Create SAFE, SCENE-BASED image prompts.
RULES:
1. NO realistic human faces/portraits
2. Focus on: Architecture, Landscapes, Environments, Symbolic elements
3. Output valid JSON: {"image_prompts": [{"scene_description": "...", "negative_prompt": "..."}]}"""

    user_prompt = f"""Create 2-3 visual prompts from this {story_type} story:

TOPIC: {topic}
ERA: {era}
STORY: {story_text[:3000]}

Style: {style_instruct}

Each prompt needs:
- scene_description: Detailed scene (NO faces/portraits)
- negative_prompt: Always include "realistic human faces, portraits, text, watermark"

Output ONLY the JSON object."""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=1024,
            response_format={"type": "json_object"}
        )
        
        result = json.loads(response.choices[0].message.content)
        return result
        
    except Exception as e:
        logger.error(f"Image prompt generation error: {e}")
        return {"image_prompts": []}

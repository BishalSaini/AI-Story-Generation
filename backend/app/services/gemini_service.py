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
    model_name="gemini-3-flash-preview",
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


# Dedicated model for Chat (Text Output, No Story System Prompt)
chat_model = genai.GenerativeModel(
    model_name="gemini-3-flash-preview",
    generation_config={
        "temperature": 0.7,
        "top_p": 0.95,
        "top_k": 40,
        "max_output_tokens": 1024,
        "response_mime_type": "text/plain",
    }
)

# Dedicated model for JSON Extraction tasks (No Story System Prompt)
extraction_model = genai.GenerativeModel(
    model_name="gemini-3-flash-preview",
    generation_config={
        "response_mime_type": "application/json",
    }
)


image_prompt_model = genai.GenerativeModel(
    model_name="gemini-3-flash-preview",
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

async def generate_story(topic: str, era: str, style: str, story_type: str = "Historical", language: str = "English"):
    # Language Instruction
    lang_instruction = f"Output the story content, title, and moral entirely in {language} language. Keep keys in English JSON."

    # Adapt the prompt based on story type
    if story_type == "Creative":
        prompt = f"""
        You are a creative storytelling AI with unlimited imagination.
        {lang_instruction}
        
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
        8. Length: Aim for 600-800 words for a concise yet detailed narrative.
        9. Conclude with a meaningful moral or lesson from the story
        
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
          "story_content": "Full creative narrative written in {style} style. Use **markdown bold** for key names or terms. IMPORTANT: Separate paragraphs with double newlines (\\n\\n). Case study: Ensure the story is split into at least 4-5 clearly defined paragraphs.",
          "moral": "The key lesson or message of this story"
        }}
        
        Begin generating the creative story now.
        """
    elif story_type == "Hybrid":
        prompt = f"""
        You are a creative historical storytelling AI.
        {lang_instruction}
        
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
        8. STRUCTURE: Output the text in properly separated paragraphs.
        
        Required Output Format (MUST be valid JSON):
        {{
          "title": "An engaging title for the story",
          "era": "{era}",
          "timeline": [
            {{"date": "YYYY or story point", "event": "What happened"}},
            {{"date": "YYYY or story point", "event": "What happened"}}
          ],
          "main_events_summary": ["Key event 1", "Key event 2", "Key event 3"],
          "story_content": "Full narrative blending historical facts with creative storytelling, written in {style} style. Use **bold** for key historical figures or dates. Separate paragraphs with double newlines (\\n\\n).",
          "moral": "The key lesson from this narrative"
        }}
        
        Begin generating the hybrid story now.
        """
    elif story_type == "Mythology":
        prompt = f"""
        You are an expert in world mythology and folklore explanation.
        {lang_instruction}
        
        Task: Tell the legend/myth of {topic} from the perspective of {era} era beliefs (if applicable) or its original context.
        Writing Style: {style}
        
        Instructions:
        1. Focus on the cultural significance, symbolism, and narrative of the myth
        2. Explain the origins and the values it represents
        3. Keep the tone mystical yet educational
        4. Write in {style} style
        5. Conclude with the modern relevance or moral
        
        Required Output Format (MUST be valid JSON):
        {{
          "title": "Title of the Myth/Legend",
          "era": "{era}",
          "timeline": [
            {{"date": "Origin/Phase", "event": "Key mythical event"}}
          ],
          "main_events_summary": ["Mythic Event 1", "Mythic Event 2"],
          "story_content": "Full retelling of the myth/legend...",
          "moral": "Cultural lesson or moral"
        }}
        """
    elif story_type == "AltHistory":
        prompt = f"""
        You are an Alternative History specialist offering 'What If?' scenarios.
        {lang_instruction}
        
        Task: Create a plausible alternative history story where {topic} happened differently during the {era} era.
        Writing Style: {style}
        
        Instructions:
        1. Start with a real historical divergence point (POD)
        2. Extrapolate logical consequences of this change
        3. Describe how the world/setting changes as a result
        4. Make it thought-provoking but grounded in historical logic
        5. Write in {style} style
        
        Required Output Format (MUST be valid JSON):
        {{
          "title": "Title of the Alternative History",
          "era": "{era} (Alternative)",
          "timeline": [
            {{"date": "Divergence Point", "event": " The moment history changed"}},
            {{"date": "+1 Year", "event": "Consequence"}}
          ],
          "main_events_summary": ["The Change", "Immediate Aftermath", "Long-term Result"],
          "story_content": "Full alternative history narrative...",
          "moral": "Reflection on historical causality"
        }}
        """
    elif story_type == "SciFi":
        prompt = f"""
        You are a Science Fiction visionary.
        {lang_instruction}
        
        Task: Create a futuristic or sci-fi story about {topic} set in {era} (interpret {era} creatively if needed, e.g. 'Future Era').
        Writing Style: {style}
        
        Instructions:
        1. Incorporate advanced technology, space travel, or futuristic society concepts.
        2. Explore the impact of these technologies on human (or alien) life.
        3. Create a compelling narrative with conflict and resolution.
        4. World-building is key - describe the setting vividly.
        5. Write in {style} style.
        
        Required Output Format (MUST be valid JSON):
        {{
          "title": "Sci-Fi Title",
          "era": "{era}",
          "timeline": [
            {{"date": "Start", "event": "Intro"}},
            {{"date": "Crisis", "event": "The problem emerges"}}
          ],
          "main_events_summary": ["Discovery", "Conflict", "Resolution"],
          "story_content": "Full sci-fi narrative...",
          "moral": "Reflection on technology or progress"
        }}
        """
    elif story_type == "Mystery":
        prompt = f"""
        You are a Master Detective storyteller like Arthur Conan Doyle or Agatha Christie.
        {lang_instruction}
        
        Task: Create a gripping mystery or detective story involving {topic} set in the {era} era.
        Writing Style: {style}
        
        Instructions:
        1. Establish a central mystery, crime, or puzzle early on.
        2. Introduce clues, red herrings, and suspects.
        3. Build suspense and tension throughout the narrative.
        4. Reveal the solution in a satisfying climax.
        5. Write in {style} style (Noir, Thriller, or Classic Mystery).
        
        Required Output Format (MUST be valid JSON):
        {{
          "title": "The Mystery of {topic}",
          "era": "{era}",
          "timeline": [
            {{"date": "The Incident", "event": "Discovery of the crime/mystery"}},
            {{"date": "Investigation", "event": "Gathering clues"}}
          ],
          "main_events_summary": ["The Crime", "The Suspects", "The Twist", "The Truth"],
          "story_content": "Full mystery narrative...",
          "moral": "Lesson on truth or justice"
        }}
        """
    elif story_type == "TimeTravel":
        prompt = f"""
        You are a Sci-Fi Historical guide.
        {lang_instruction}
        
        Task: Describe a journey of a modern person traveling back to meet/witness {topic} in the {era} era.
        Writing Style: {style}
        
        Instructions:
        1. Contrast modern perspectives with historical reality
        2. Describe the sensory shock (smells, sights, sounds) of the past
        3. Highlight the differences in technology, culture, and daily life
        4. Write in {style} style (likely First Person or Descriptive)
        
        Required Output Format (MUST be valid JSON):
        {{
          "title": "Time Traveler's Log: {topic}",
          "era": "{era}",
          "timeline": [
            {{"date": "Arrival", "event": "Arriving in {era}"}},
            {{"date": "Encounter", "event": "Meeting the subject"}}
          ],
          "main_events_summary": ["Arrival", "Culture Shock", "The Encounter", "Return"],
          "story_content": "Full narrative of the time travel experience...",
          "moral": "Reflection on the past vs present"
        }}
        """
    else:  # Historical (default)
        prompt = f"""
        You are a historical storytelling AI with access to comprehensive historical knowledge.
        {lang_instruction}
        
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
    if story_type in ["Creative", "SciFi", "Mythology", "Mystery", "AltHistory"]:
        style_instruct = "fantasy art, concept art, illustration, digital painting"
        if story_type == "SciFi":
            style_instruct = "futuristic concept art, sci-fi illustration, cyberpunk or space opera style"
        elif story_type == "Mythology":
            style_instruct = "epic fantasy art, oil painting style, ethereal and mystical"
        elif story_type == "Mystery":
            style_instruct = "film noir, moody illustration, high contrast, suspenseful atmosphere"
        elif story_type == "AltHistory":
            style_instruct = "steampunk or dieselpunk style, alternative historical concept art"

        prompt = f"""
        Based on this {story_type} story, create 3-4 distinct visual prompts for illustration.
        
        STORY TOPIC: {topic}
        SETTING: {era} (Genre: {story_type})
        STORY EXCERPT: {story_text[:4000]}
        
        CRITICAL RULES FOR IMAGE GENERATION:
        1. NO realistic human faces or close-up portraits
        2. Focus on:
           - Environments, landscapes, and architecture matching {story_type} themes
           - Symbolic or key elements from the story
           - Atmospheric scenes that capture the mood
           - Wide shots of settings and locations
        3. Use artistic styles like: {style_instruct}
        4. Avoid: realistic human faces, portraits, text overlays, watermarks
        
        For each scene, provide:
        - scene_description: A detailed description in {style_instruct} style.
        - negative_prompt: What to avoid (always include: "realistic human faces, portraits, text, watermark")
        
        Output Format (MUST be valid JSON):
        {{
          "image_prompts": [
            {{
              "scene_description": "...",
              "negative_prompt": "..."
            }}
          ]
        }}
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


async def extract_characters(story_text: str):
    prompt = f"""
    Read the following story and list every person, divine figure, or named entity that plays a role.
    If a character is mentioned by role but not name (e.g. 'The Old Hermit'), include that too.
    
    Story:
    {story_text[:6000]}
    
    IMPORTANT: You must return a VALID JSON object with a single key 'characters' containing an array of strings.
    Example: {{"characters": ["Arjun", "Karna", "Krishna"]}}
    """
    try:
        # Use extraction_model to avoid system prompt interference
        response = await extraction_model.generate_content_async(prompt)
        text = response.text.strip()
        # Remove potential markdown backticks if present
        if text.startswith("```json"):
            text = text.replace("```json", "", 1).replace("```", "", 1).strip()
        elif text.startswith("```"):
            text = text.replace("```", "", 2).strip()
            
        return json.loads(text)
    except Exception as e:
        logger.error(f"Error extracting characters: {e}")
        return {"characters": []}


async def generate_character_chat_response(story_context: str, character_name: str, chat_history: list, user_message: str):
    # Construct history context
    history_text = "\n".join([f"{msg['role']}: {msg['content']}" for msg in chat_history[-5:]])
    
    prompt = f"""
    You are {character_name}, a character from the story below.
    Your goal is to converse with the user IN CHARACTER.
    
    Context Story:
    {story_context[:4000]}
    
    Instructions:
    1. Stay strictly in character as {character_name}.
    2. Use the tone, vocabulary, and knowledge appropriate for your character and the era.
    3. Refer to events in the story if relevant, but you can also improvise based on your persona.
    4. Keep responses concise (under 3 sentences) and engaging.
    5. Do not break character.
    
    Chat History:
    {history_text}
    
    User: {user_message}
    {character_name}:
    """
    
    try:
        # Use chat_model (Text response) to avoid forcing JSON
        response = await chat_model.generate_content_async(prompt)
        return {"response": response.text.strip()}
    except Exception as e:
        logger.error(f"Error generating chat response: {e}")
        return {"response": "I am lost for words..."}

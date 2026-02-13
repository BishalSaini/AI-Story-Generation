
import edge_tts
import os
import uuid
import asyncio
import re
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

AUDIO_DIR = "static/audio"
os.makedirs(AUDIO_DIR, exist_ok=True)

# Language-specific voice mappings
# Each language has a default voice and optionally style-based voices
LANGUAGE_VOICE_MAP = {
    "Hindi": {
        "Default": "hi-IN-SwaraNeural",       # Female Hindi
        "Male": "hi-IN-MadhurNeural",          # Male Hindi
        "Historical": "hi-IN-MadhurNeural",
        "Creative": "hi-IN-SwaraNeural",
        "Mythology": "hi-IN-SwaraNeural",
        "Mystery": "hi-IN-MadhurNeural",
    },
    "Marathi": {
        "Default": "mr-IN-AarohiNeural",       # Female Marathi
        "Male": "mr-IN-ManoharNeural",          # Male Marathi
        "Historical": "mr-IN-ManoharNeural",
        "Creative": "mr-IN-AarohiNeural",
        "Mythology": "mr-IN-AarohiNeural",
        "Mystery": "mr-IN-ManoharNeural",
    },
    "English": {
        "Default": "en-US-ChristopherNeural",
        "Historical": "en-GB-SoniaNeural",
        "Creative": "en-US-GuyNeural",
        "Mythology": "en-IN-NeerjaNeural",
        "TimeTravel": "en-US-AriaNeural",
        "SciFi": "en-US-DavisNeural",
        "Mystery": "en-US-GuyNeural",
    },
}

# Fallback: English voice mapping for backwards compatibility
VOICE_MAPPING = LANGUAGE_VOICE_MAP["English"]


def _detect_language_from_text(text: str) -> str:
    """Detect language from text by checking Unicode script ranges."""
    # Take a sample of the text (first 500 chars, skip spaces/punctuation)
    sample = text[:500]
    
    # Count characters in different script ranges
    devanagari_count = len(re.findall(r'[\u0900-\u097F]', sample))  # Hindi, Marathi
    latin_count = len(re.findall(r'[a-zA-Z]', sample))
    
    # If very few non-latin characters, default to English
    if devanagari_count < 10 and latin_count > 20:
        return "English"
    
    # If Devanagari script is dominant, default to Hindi
    # (Marathi also uses Devanagari, but user can explicitly select Marathi if needed)
    if devanagari_count > latin_count:
        logger.info(f"Language auto-detected as: Hindi (Devanagari count: {devanagari_count})")
        return "Hindi"
    
    logger.info(f"Language auto-detected as: English (Latin count: {latin_count})")
    return "English"


def _get_voice_for_language(language: str, story_type: str) -> str:
    """Get the best voice for a given language and story type."""
    lang_voices = LANGUAGE_VOICE_MAP.get(language, LANGUAGE_VOICE_MAP["English"])
    
    # Try story-type-specific voice first, then default for that language
    voice = lang_voices.get(story_type, lang_voices.get("Default", "en-US-ChristopherNeural"))
    logger.info(f"Selected voice: {voice} (language={language}, story_type={story_type})")
    return voice


async def generate_story_audio(text: str, story_type: str = "Historical", language: str = ""):
    try:
        # Determine language: use explicit param, or auto-detect from text
        if language and language in LANGUAGE_VOICE_MAP:
            detected_language = language
        else:
            detected_language = _detect_language_from_text(text)
        
        # Select voice based on language + story type
        voice = _get_voice_for_language(detected_language, story_type)
        logger.info(f"Generating audio: language={detected_language}, story_type={story_type}, voice={voice}")
        
        # Split text into chunks by paragraph for parallel synthesis
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        
        # Synthesize paragraphs in parallel
        tasks = [_synthesize_chunk(p, voice) for p in paragraphs]
        results = await asyncio.gather(*tasks)
        
        # Merge results
        combined_audio = bytearray()
        combined_alignment = []
        current_time_offset = 0.0
        
        for res in results:
            if not res: continue
            
            # Add audio
            combined_audio.extend(res["audio_data"])
            
            # Add alignment with offset
            for align in res["alignment"]:
                # Deep copy and offset
                new_align = align.copy()
                new_align["start"] += current_time_offset
                new_align["end"] += current_time_offset
                combined_alignment.append(new_align)
            
            # Update offset (using the end time of the last word in this chunk)
            if res["alignment"]:
                current_time_offset = res["alignment"][-1]["end"] + 0.3 # Add slight pause between paragraphs
        
        # FALLBACK: If no WordBoundary events, synthesize them from sentences
        word_boundaries = [a for a in combined_alignment if a["type"] == "WordBoundary"]
        if len(word_boundaries) == 0:
            logger.warning("No WordBoundary events found, synthesizing from sentences...")
            combined_alignment = _synthesize_word_boundaries(combined_alignment, text)
        
        # Save merged audio
        filename = f"{uuid.uuid4()}.mp3"
        filepath = os.path.join(AUDIO_DIR, filename)
        with open(filepath, "wb") as f:
            f.write(combined_audio)
            
        return {
            "audioUrl": f"/static/audio/{filename}",
            "alignment": combined_alignment
        }
        
    except Exception as e:
        logger.error(f"FATAL: Error generating audio for language='{language}', story_type='{story_type}': {e}", exc_info=True)
        return None

def _synthesize_word_boundaries(sentence_alignment: list, full_text: str) -> list:
    """Generate word-level alignment from sentence boundaries."""
    new_alignment = []
    
    for sent in sentence_alignment:
        if sent["type"] != "SentenceBoundary":
            new_alignment.append(sent)
            continue
        
        # Get the sentence text
        sentence_text = sent.get("word", "").strip()
        if not sentence_text:
            new_alignment.append(sent)
            continue
        
        # Split into words
        words = sentence_text.split()
        if not words:
            new_alignment.append(sent)
            continue
        
        # Calculate timing per word
        sentence_duration = sent["end"] - sent["start"]
        time_per_word = sentence_duration / len(words)
        
        # Create word boundaries
        current_time = sent["start"]
        for word in words:
            new_alignment.append({
                "word": word,
                "start": current_time,
                "end": current_time + time_per_word,
                "type": "WordBoundary"
            })
            current_time += time_per_word
        
        # Keep the sentence boundary too
        new_alignment.append(sent)
    
    logger.info(f"Synthesized {len([a for a in new_alignment if a['type'] == 'WordBoundary'])} word boundaries")
    return new_alignment

async def _synthesize_chunk(text: str, voice: str):
    try:
        # Add rate parameter - sometimes helps with word boundary generation
        communicate = edge_tts.Communicate(text, voice, rate="+0%")
        audio_data = bytearray()
        alignment = []
        event_types = set()
        
        async for message in communicate.stream():
            if message["type"] == "audio":
                audio_data.extend(message["data"])
            elif message["type"] in ["WordBoundary", "SentenceBoundary"]:
                event_types.add(message["type"])
                alignment.append({
                    "word": message.get("text", ""),
                    "start": message["offset"] / 10_000_000,
                    "end": (message["offset"] + message["duration"]) / 10_000_000,
                    "type": message["type"]
                })
        
        logger.info(f"Synthesis complete. Events captured: {event_types}, Total events: {len(alignment)}")
        if "WordBoundary" not in event_types:
            logger.warning(f"WARNING: No WordBoundary events received! Only got: {event_types}")
        
        return {"audio_data": audio_data, "alignment": alignment}
    except Exception as e:
        logger.error(f"Error in chunk synthesis: {e}")
        return None

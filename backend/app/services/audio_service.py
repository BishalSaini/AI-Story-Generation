
import edge_tts
import os
import uuid
import asyncio
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

AUDIO_DIR = "static/audio"
os.makedirs(AUDIO_DIR, exist_ok=True)

# Voice mapping for different styles/eras
VOICE_MAPPING = {
    "Historical": "en-GB-SoniaNeural",  # British Female, formal
    "Creative": "en-US-GuyNeural",      # US Male, energetic
    "Mythology": "en-IN-NeerjaNeural",  # Indian accent (often good for mystical) or en-GB
    "TimeTravel": "en-US-AriaNeural",   
    "SciFi": "en-US-DavisNeural",       # Synthetic/Tech vibe
    "Mystery": "en-US-GuyNeural",       # Serious/Narration
    "Default": "en-US-ChristopherNeural" 
}

async def generate_story_audio(text: str, story_type: str = "Historical"):
    try:
        # Select voice based on story type
        voice = VOICE_MAPPING.get(story_type, VOICE_MAPPING["Default"])
        
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
        logger.error(f"FATAL: Error generating audio for story_type '{story_type}': {e}", exc_info=True)
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

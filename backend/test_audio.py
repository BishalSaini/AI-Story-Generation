
import asyncio
import edge_tts
from app.services.audio_service import generate_story_audio

async def debug_stream():
    text = "Testing alignment."
    voice = "en-US-AriaNeural"
    communicate = edge_tts.Communicate(text, voice)
    
    print(f"Testing voice: {voice}")
    async for message in communicate.stream():
        print(f"Received message type: {message['type']}")
        if message['type'] == 'WordBoundary':
            print("GOT BOUNDARY:", message)
        elif message['type'] == 'SentenceBoundary':
            print("GOT SENTENCE:", message)
            
if __name__ == "__main__":
    asyncio.run(debug_stream())

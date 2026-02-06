import asyncio
import edge_tts

async def test_audio():
    communicate = edge_tts.Communicate("Hello world", "en-US-AriaNeural")
    async for message in communicate.stream():
        if message["type"] == "audio":
            print("Received audio data!")
            return True
    return False

if __name__ == "__main__":
    result = asyncio.run(test_audio())
    print(f"Result: {result}")

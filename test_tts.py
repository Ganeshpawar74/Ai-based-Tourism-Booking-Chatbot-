import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from elevenlabs.client import ElevenLabs
import base64

# Test the ElevenLabs API
api_key = "sk_64dbd14ffd0efe17256050bcc331c5ed1cddbf4b23cdbfd4"
voice_id = "21m00Tcm4TlvDq8ikWAM"

client = ElevenLabs(api_key=api_key)

print("Testing ElevenLabs API...")
print(f"Client: {client}")
print(f"TTS Module: {client.text_to_speech}")

# Try the convert method
try:
    audio_generator = client.text_to_speech.convert(
        text="Hello world",
        voice_id=voice_id,
        model_id="eleven_multilingual_v2"
    )
    print(f"Audio generator: {audio_generator}")
    
    # Collect bytes
    audio_bytes = b''.join(audio_generator)
    print(f"Audio bytes collected: {len(audio_bytes)}")
    print("✅ TTS conversion successful!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()

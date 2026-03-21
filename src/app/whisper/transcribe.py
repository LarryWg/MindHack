import os
from openai import OpenAI
from dotenv import load_dotenv

# This loads the variables from .env
load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def transcribe_audio(file_path):
    with open(file_path, "rb") as audio_file:
        return client.audio.transcriptions.create(
            model="gpt-4o-mini-transcribe",
            file=audio_file,
            response_format="text"
        )

# Test it
if __name__ == "__main__":
    print(transcribe_audio("test_audio.mp3"))
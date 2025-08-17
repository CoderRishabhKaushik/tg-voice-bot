import sys
import asyncio
from telethon import TelegramClient
from pytgcalls import PyTgCalls
from pytgcalls.types import Update
# Removed StreamAudioEnded and AlreadyJoinedError as they no longer exist

api_id = int(sys.argv[1])
api_hash = sys.argv[2]
phone = sys.argv[3]

client = TelegramClient("session", api_id, api_hash)
call_client = PyTgCalls(client)

queues = {}
current = {}

async def play_audio(chat_id, url):
    from pytgcalls.types.input_stream import InputStream, InputAudioStream
    import subprocess

    # Stop current audio if playing
    if chat_id in current:
        try:
            await call_client.leave_group_call(chat_id)
        except Exception as e:
            print(f"Error leaving call: {e}")

    # Spawn ffmpeg process to convert audio
    process = subprocess.Popen(
        ["ffmpeg", "-i", url, "-f", "s16le", "-ar", "48000", "-ac", "2", "pipe:1"],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL
    )

    # Join VC and stream audio
    try:
        await call_client.join_group_call(
            chat_id,
            InputStream(InputAudioStream(process.stdout))
        )
    except Exception as e:
        print(f"Could not join call: {e}")

async def main():
    await client.start(phone)
    await call_client.start()
    print("READY")  # Signal Node.js that Python bridge is ready
    sys.stdout.flush()
    
    # Keep running
    while True:
        await asyncio.sleep(1)

# Run the async main loop
asyncio.run(main())

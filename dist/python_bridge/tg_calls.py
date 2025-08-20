import sys
import asyncio
from telethon import TelegramClient
from pytgcalls import PyTgCalls
import logging
from collections import deque

# --------------------------
# 🔹 Suppress PyTgCalls info logs
logging.getLogger("pytgcalls").setLevel(logging.ERROR)
# --------------------------


# Force UTF-8 stdout (Windows fix)
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")


# Command-line arguments
api_id = int(sys.argv[1])
api_hash = sys.argv[2]
phone = sys.argv[3]
login_code = sys.argv[4] if len(sys.argv) > 4 else None

client = TelegramClient("session", api_id, api_hash)
call_client = PyTgCalls(client)

# Queues: chat_id -> deque of URLs
queues = {}
current = {}  # chat_id -> current URL being played


async def play_next(chat_id):
    """Play the next song in the queue for this chat."""
    if chat_id in queues and queues[chat_id]:
        url = queues[chat_id].popleft()
        current[chat_id] = url

        # Stream audio via PyTgCalls
        try:
            await call_client.play(chat_id, url)
            print(f"🎶 PLAYING {url}")
            sys.stdout.flush()
        except Exception as e:
            print(f"⚠️ ERROR Playing {url}: {e}")
            sys.stdout.flush()
            await play_next(chat_id)
    else:
        current.pop(chat_id, None)
        print("🎵 QUEUE_EMPTY")
        sys.stdout.flush()


async def handle_command(chat_id, command, arg=None):
    """Handle a command from Node.js"""
    command = command.upper()
    if command == "PLAY":
        if chat_id not in queues:
            queues[chat_id] = deque()
        queues[chat_id].append(arg)
        print(f"✅ Added to queue: {arg}")
        sys.stdout.flush()
        if chat_id not in current:
            await play_next(chat_id)
    elif command == "STOP":
        try:
            await call_client.stop(chat_id)
        except Exception:
            pass
        current.pop(chat_id, None)
        queues.pop(chat_id, None)
        print("⏹ STOPPED")
        sys.stdout.flush()
    elif command == "SKIP":
        await call_client.stop(chat_id)
        print("⏭ SKIPPED")
        sys.stdout.flush()
        await play_next(chat_id)


async def command_listener():
    """Listen for commands from Node.js via stdin"""
    while True:
        line = await asyncio.get_event_loop().run_in_executor(None, sys.stdin.readline)
        if not line:
            continue
        line = line.strip()
        parts = line.split(" ", 2)
        if len(parts) < 2:
            continue
        cmd, chat_id_str = parts[0].upper(), parts[1]
        chat_id = int(chat_id_str)
        arg = parts[2] if len(parts) > 2 else None
        await handle_command(chat_id, cmd, arg)


async def main():
    # Start Telegram client
    if login_code:
        await client.start(phone=lambda: phone, code=lambda: login_code)
    else:
        await client.start(phone)

    me = await client.get_me()
    # Custom banner
    print(f"Signed in successfully as {me.first_name}")
    print("🎵 tg-voice-bot v2 powered by Rishabh Kaushik")
    print("Ready To Stream")
    sys.stdout.flush()

    # Start PyTgCalls
    await call_client.start()

    # Start listening to Node.js commands
    await command_listener()


asyncio.run(main())

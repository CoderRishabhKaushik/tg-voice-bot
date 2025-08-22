import sys, asyncio, logging
from collections import deque
from telethon import TelegramClient
from pytgcalls import PyTgCalls

logging.getLogger("pytgcalls").setLevel(logging.ERROR)
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

api_id     = int(sys.argv[1])
api_hash   = sys.argv[2]
phone      = sys.argv[3]
login_code = sys.argv[4] if len(sys.argv) > 4 else None

# ---- globals -------------------------------------------------
queues  = {}
current = {}
call_client = None          # will be set inside main()

print("[DEBUG] Python bridge starting with API_ID:", api_id)

# ------------------------------------------------------------- 
async def play_next(chat_id: int):
    if queues.get(chat_id):
        url = queues[chat_id].popleft()
        current[chat_id] = url
        print(f"[DEBUG] play_next() -> chat_id={chat_id}, url={url}")
        try:
            await call_client.join_group_call(chat_id, url)
            print(f"🎶 PLAYING {url}", flush=True)
        except Exception as e:
            print(f"⚠️ ERROR playing {url}: {e}", flush=True)
            await play_next(chat_id)
    else:
        current.pop(chat_id, None)
        print(f"[DEBUG] Queue empty for chat_id={chat_id}", flush=True)
        print("🎵 QUEUE_EMPTY", flush=True)

# ------------------------------------------------------------- 
async def handle_command(chat_id: int, cmd: str, arg=None):
    cmd = cmd.upper()
    print(f"[DEBUG] handle_command() -> chat_id={chat_id}, cmd={cmd}, arg={arg}")
    if cmd == "PLAY":
        queues.setdefault(chat_id, deque()).append(arg)
        print(f"✅ Added to queue: {arg}", flush=True)
        if chat_id not in current:
            await play_next(chat_id)
    elif cmd == "STOP":
        print(f"[DEBUG] STOP command received for chat_id={chat_id}")
        await call_client.leave_group_call(chat_id)
        queues.pop(chat_id, None)
        current.pop(chat_id, None)
        print("⏹ STOPPED", flush=True)
    elif cmd == "SKIP":
        print(f"[DEBUG] SKIP command received for chat_id={chat_id}")
        await call_client.leave_group_call(chat_id)
        print("⏭ SKIPPED", flush=True)
        await play_next(chat_id)

async def command_listener():
    loop = asyncio.get_event_loop()
    print("[DEBUG] command_listener started")
    while True:
        line = await loop.run_in_executor(None, sys.stdin.readline)
        if not line:
            continue
        parts = line.strip().split(" ", 2)
        if len(parts) < 2:
            continue
        cmd, chat_id_str, *rest = parts
        print(f"[DEBUG] command_listener received line: {line.strip()}")
        await handle_command(int(chat_id_str), cmd.upper(), rest[0] if rest else None)

# ------------------------------------------------------------- 
async def main():
    global call_client
    print("[DEBUG] Starting Telegram client...")
    client = TelegramClient("session", api_id, api_hash)

    if login_code:
        print("[DEBUG] Using login code for sign-in")
        await client.start(phone=lambda: phone, code=lambda: login_code)
    else:
        await client.start(phone)

    me = await client.get_me()
    print(f"[DEBUG] Signed in as {me.first_name} ({me.id}) – ready to stream 🎵", flush=True)

    call_client = PyTgCalls(client)
    print("[DEBUG] Starting PyTgCalls client")
    await call_client.start()
    print("[DEBUG] PyTgCalls client started successfully")

    await command_listener()

if __name__ == "__main__":
    print("[DEBUG] Running main()")
    asyncio.run(main())

# tg-voice-bot - Telegram Music Bot 🎵

> Easily create your own Telegram Music Bot that streams to voice chats, powered by **Node.js + Python (PyTgCalls)**.

## Features

- Stream music directly to Telegram voice chats
- Uses PyTgCalls and Telethon under the hood
- Easy to integrate and extend
- Cross-platform (Node.js + Python bridge)

## Installation

```bash
npm install tg-voice-bot
```

## Setup

1. Clone the project from GitHub or use it in another project:
2. Make sure you have **Python 3.11+** installed.
3. Install Python dependencies:

```bash
pip install -r ./dist/python_bridge/requirements.txt
```

4. Build the project (if using TypeScript source):

```bash
npm run build
```

## Usage

```bash
import { TgMusicBot } from "tg-voice-bot";

const bot = new TgMusicBot({
apiId: 123456, // Your Telegram API ID
apiHash: "your_api_hash", // Your Telegram API Hash
phone: "+1234567890", // Your phone number
botToken: "your_bot_token"// Optional: Telegram Bot token
});

bot.start(); // Starts the music bot
```

> Make sure to replace \`apiId\`, \`apiHash\`, \`phone\`, and \`botToken\` with your Telegram credentials.

The bot will join voice chats and allow music streaming commands.

---

## Bot Commands

- /play <songname> – Plays a song in the voice chat
- /skip – Skips the currently playing song
- /stop – Stops playback and clears the queue

> Example:

```bash
/play Despacito
/skip
/stop
```

---

## Python Bridge

- Python scripts used for voice streaming are located in \`dist/python_bridge/\`
- Dependencies are listed in \`requirements.txt\`

## Development

```bash

# Install dependencies

npm install

# Build TypeScript + copy Python bridge

npm run build

# Start bot in development mode

npm run dev
```

## Documentation

- Main classes: \`TgMusicBot\` and \`TgVoiceStream\`

## Contributing

- Open issues or pull requests on [GitHub](https://github.com/CoderRishabhKaushik/tg-voice-bot)

---

## License

MIT © Rishabh Kaushik

---

## Keywords

> telegram, music-bot, pytgcalls, telethon, nodejs, voice-chat

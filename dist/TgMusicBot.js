import TelegramBot from "node-telegram-bot-api";
import { TgVoiceStream } from "./TgVoiceStream.js";
export class TgMusicBot {
    constructor(config) {
        this.config = config;
        this.stream = new TgVoiceStream(config.apiId, config.apiHash, config.phone, config.loginCode || null);
        this.bot = new TelegramBot(config.botToken, { polling: true });
    }
    async launch() {
        await this.stream.start();
        this.bot.onText(/\/play (.+)/, async (msg, match) => {
            const chatId = msg.chat.id;
            const songName = match?.[1];
            if (!songName)
                return;
            await this.stream.playByName(chatId, songName);
            this.bot.sendMessage(chatId, `🎶 Playing: ${songName}`);
        });
        this.bot.onText(/\/skip/, (msg) => {
            const chatId = msg.chat.id;
            this.stream.skip(chatId);
            this.bot.sendMessage(chatId, "⏭ Skipped");
        });
        this.bot.onText(/\/stop/, (msg) => {
            const chatId = msg.chat.id;
            this.stream.stop(chatId);
            this.bot.sendMessage(chatId, "⏹ Stopped");
        });
        this.bot.onText(/\/groups/, async (msg) => {
            const chatId = msg.chat.id;
            try {
                const groups = await this.stream.listGroups();
                const list = groups.map((g) => `${g.name} (${g.id})`).join("\n");
                this.bot.sendMessage(chatId, `📋 Groups:\n${list}`);
            }
            catch (err) {
                this.bot.sendMessage(chatId, "⚠️ Failed to fetch groups.");
            }
        });
        console.log("✅ TgMusicBot is running!");
    }
}

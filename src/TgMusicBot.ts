import TelegramBot from "node-telegram-bot-api";
import { TgVoiceStream } from "./TgVoiceStream.js";

interface BotConfig {
  apiId: number;
  apiHash: string;
  phone: string;
  botToken: string;
  loginCode?: string | null;
}

export class TgMusicBot {
  private stream: TgVoiceStream;
  private bot: TelegramBot;

  constructor(private config: BotConfig) {
    console.log("[DEBUG] TgMusicBot.constructor called with config:", config);
    this.stream = new TgVoiceStream(
      config.apiId,
      config.apiHash,
      config.phone,
      config.loginCode || null
    );
    this.bot = new TelegramBot(config.botToken, { polling: true });
    console.log("[DEBUG] Telegram bot instance created, polling started");
  }

  async launch() {
    console.log("[DEBUG] Launching TgVoiceStream...");
    await this.stream.start();
    console.log("[DEBUG] TgVoiceStream started successfully");

    this.bot.onText(/\/play (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const songName = match?.[1];
      console.log(
        `[DEBUG] /play command received from chatId=${chatId}, song=${songName}`
      );
      if (!songName) return;
      await this.stream.playByName(chatId, songName);
      this.bot.sendMessage(chatId, `🎶 Playing: ${songName}`);
    });

    this.bot.onText(/\/skip/, (msg) => {
      const chatId = msg.chat.id;
      console.log(`[DEBUG] /skip command received from chatId=${chatId}`);
      this.stream.skip(chatId);
      this.bot.sendMessage(chatId, "⏭ Skipped");
    });

    this.bot.onText(/\/stop/, (msg) => {
      const chatId = msg.chat.id;
      console.log(`[DEBUG] /stop command received from chatId=${chatId}`);
      this.stream.stop(chatId);
      this.bot.sendMessage(chatId, "⏹ Stopped");
    });

    this.bot.onText(/\/groups/, async (msg) => {
      const chatId = msg.chat.id;
      console.log(`[DEBUG] /groups command received from chatId=${chatId}`);
      try {
        const groups = await this.stream.listGroups();
        console.log("[DEBUG] Retrieved groups:", groups);
        const list = groups.map((g) => `${g.name} (${g.id})`).join("\n");
        this.bot.sendMessage(chatId, `📋 Groups:\n${list}`);
      } catch (err) {
        console.error("[DEBUG] Failed to fetch groups:", err);
        this.bot.sendMessage(chatId, "⚠️ Failed to fetch groups.");
      }
    });

    console.log("✅ TgMusicBot is running!");
  }
}

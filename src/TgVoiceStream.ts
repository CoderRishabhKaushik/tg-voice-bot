import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import readline from "readline";
import yts from "yt-search";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class TgVoiceStream {
  apiId: number;
  apiHash: string;
  phone: string;
  loginCode: string | null;
  pyProcess: ChildProcessWithoutNullStreams | null;
  buffer: string;

  constructor(
    apiId: number,
    apiHash: string,
    phone: string,
    loginCode: string | null = null
  ) {
    this.apiId = apiId;
    this.apiHash = apiHash;
    this.phone = phone;
    this.loginCode = loginCode;
    this.pyProcess = null;
    this.buffer = "";
  }

  start(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const pyPath = path.join(__dirname, "python_bridge", "tg_calls.py");

      if (!fs.existsSync(pyPath)) {
        return reject("Python bridge not found!");
      }

      const args: (string | number)[] = [
        pyPath,
        this.apiId,
        this.apiHash,
        this.phone,
      ];
      if (this.loginCode) args.push(this.loginCode);

      this.pyProcess = spawn("python", args.map(String), {
        stdio: ["pipe", "pipe", "pipe"],
      });

      let buffer = "";

      this.pyProcess.stdout.on("data", (data: Buffer) => {
        const msg = data.toString();
        buffer += msg;

        console.log(`[PYTHON]: ${msg.trim()}`);

        if (msg.includes("Please enter the code")) {
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });
          rl.question("Enter the login code: ", (code) => {
            this.pyProcess?.stdin.write(code.trim() + "\n");
            rl.close();
          });
        }

        if (buffer.includes("Ready To Stream")) {
          console.log("✅ Python bridge is ready!");
          resolve(true);
        }
      });

      this.pyProcess.stderr.on("data", (err: Buffer) =>
        console.error(`[PYTHON ERR]: ${err.toString().trim()}`)
      );

      this.pyProcess.on("exit", (code: number | null) => {
        if (!buffer.includes("Ready To Stream"))
          reject("Python bridge exited before ready");
      });

      this.pyProcess.on("error", (err: Error) => reject(err));
    });
  }

  play(chatId: number, url: string) {
    if (!this.pyProcess) return;
    this.pyProcess.stdin.write(`PLAY ${chatId} ${url}\n`);
  }

  skip(chatId: number) {
    if (!this.pyProcess) return;
    this.pyProcess.stdin.write(`SKIP ${chatId}\n`);
  }

  stop(chatId: number) {
    if (!this.pyProcess) return;
    this.pyProcess.stdin.write(`STOP ${chatId}\n`);
  }

  async playByName(chatId: number, songName: string) {
    if (!this.pyProcess) throw new Error("Python bridge not started");

    const url = await this.getYouTubeUrl(songName);
    console.log(`🎵 Playing "${songName}" -> ${url}`);
    this.play(chatId, url);
  }

  private async getYouTubeUrl(songName: string): Promise<string> {
    const result = await yts(songName);

    if (
      result &&
      result.videos &&
      result.videos.length > 0 &&
      result.videos[0] &&
      result.videos[0].url
    ) {
      return result.videos[0].url;
    }

    throw new Error(`Song "${songName}" not found on YouTube`);
  }

  listGroups(): Promise<{ name: string; id: number }[]> {
    return new Promise((resolve, reject) => {
      if (!this.pyProcess) return reject("Python bridge not started");

      const onData = (data: Buffer) => {
        const msg = data.toString();
        if (msg.startsWith("GROUPS_LIST:")) {
          const jsonStr = msg.replace("GROUPS_LIST:", "").trim();
          try {
            const groups = JSON.parse(jsonStr);
            resolve(groups);
          } catch (err) {
            reject("Failed to parse group list from Python");
          }
          this.pyProcess?.stdout.off("data", onData);
        }
      };

      this.pyProcess.stdout.on("data", onData);
      this.pyProcess.stdin.write("LIST_GROUPS\n");
    });
  }
}

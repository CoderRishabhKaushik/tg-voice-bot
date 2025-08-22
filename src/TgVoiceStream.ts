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
    console.log("[DEBUG] TgVoiceStream.constructor called with:", {
      apiId,
      apiHash,
      phone,
      loginCode,
    });
    this.apiId = apiId;
    this.apiHash = apiHash;
    this.phone = phone;
    this.loginCode = loginCode;
    this.pyProcess = null;
    this.buffer = "";
  }

  start(): Promise<boolean> {
    console.log("[DEBUG] TgVoiceStream.start() called");
    return new Promise((resolve, reject) => {
      const pyPath = path.join(__dirname, "python_bridge", "tg_calls.py");
      console.log("[DEBUG] Python bridge path:", pyPath);

      if (!fs.existsSync(pyPath)) {
        console.log("[DEBUG] Python bridge not found!");
        return reject("Python bridge not found!");
      }

      const args: (string | number)[] = [
        pyPath,
        this.apiId,
        this.apiHash,
        this.phone,
      ];
      if (this.loginCode) args.push(this.loginCode);

      console.log("[DEBUG] Spawning Python process with args:", args);

      this.pyProcess = spawn("python", args.map(String), {
        stdio: ["pipe", "pipe", "pipe"],
      });

      let buffer = "";

      this.pyProcess.stdout.on("data", (data: Buffer) => {
        const msg = data.toString();
        buffer += msg;
        console.log(`[PYTHON STDOUT]: ${msg.trim()}`);

        if (msg.includes("Please enter the code")) {
          console.log("[DEBUG] Python requests login code");
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });
          rl.question("Enter the login code: ", (code) => {
            console.log("[DEBUG] Sending login code to Python bridge");
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
        console.error(`[PYTHON STDERR]: ${err.toString().trim()}`)
      );

      this.pyProcess.on("exit", (code: number | null) => {
        console.log("[DEBUG] Python process exited with code:", code);
        if (!buffer.includes("Ready To Stream"))
          reject("Python bridge exited before ready");
      });

      this.pyProcess.on("error", (err: Error) => {
        console.log("[DEBUG] Python process error:", err);
        reject(err);
      });
    });
  }

  play(chatId: number, url: string) {
    console.log(`[DEBUG] play() called with chatId=${chatId}, url=${url}`);
    if (!this.pyProcess) {
      console.log("[DEBUG] Python bridge not started, cannot play");
      return;
    }
    this.pyProcess.stdin.write(`PLAY ${chatId} ${url}\n`);
  }

  skip(chatId: number) {
    console.log(`[DEBUG] skip() called with chatId=${chatId}`);
    if (!this.pyProcess) {
      console.log("[DEBUG] Python bridge not started, cannot skip");
      return;
    }
    this.pyProcess.stdin.write(`SKIP ${chatId}\n`);
  }

  stop(chatId: number) {
    console.log(`[DEBUG] stop() called with chatId=${chatId}`);
    if (!this.pyProcess) {
      console.log("[DEBUG] Python bridge not started, cannot stop");
      return;
    }
    this.pyProcess.stdin.write(`STOP ${chatId}\n`);
  }

  async playByName(chatId: number, songName: string) {
    console.log(
      `[DEBUG] playByName() called with chatId=${chatId}, songName=${songName}`
    );
    if (!this.pyProcess) throw new Error("Python bridge not started");

    const url = await this.getYouTubeUrl(songName);
    console.log(`🎵 Playing "${songName}" -> ${url}`);
    this.play(chatId, url);
  }

  private async getYouTubeUrl(songName: string): Promise<string> {
    console.log(`[DEBUG] getYouTubeUrl() searching for "${songName}"`);
    const result = await yts(songName);

    if (
      result &&
      result.videos &&
      result.videos.length > 0 &&
      result.videos[0] &&
      result.videos[0].url
    ) {
      console.log(`[DEBUG] Found YouTube URL: ${result.videos[0].url}`);
      return result.videos[0].url;
    }

    console.log(`[DEBUG] Song not found: "${songName}"`);
    throw new Error(`Song "${songName}" not found on YouTube`);
  }

  listGroups(): Promise<{ name: string; id: number }[]> {
    console.log("[DEBUG] listGroups() called");
    return new Promise((resolve, reject) => {
      if (!this.pyProcess) {
        console.log("[DEBUG] Python bridge not started, cannot list groups");
        return reject("Python bridge not started");
      }

      const onData = (data: Buffer) => {
        const msg = data.toString();
        console.log(`[PYTHON STDOUT]: ${msg.trim()}`);
        if (msg.startsWith("GROUPS_LIST:")) {
          const jsonStr = msg.replace("GROUPS_LIST:", "").trim();
          try {
            const groups = JSON.parse(jsonStr);
            console.log("[DEBUG] Parsed groups:", groups);
            resolve(groups);
          } catch (err) {
            console.log("[DEBUG] Failed to parse groups from Python:", err);
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

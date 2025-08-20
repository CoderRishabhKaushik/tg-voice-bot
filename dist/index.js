import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import readline from "readline";
import yts from "yt-search"; // YouTube search
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class TgVoiceStream {
    apiId;
    apiHash;
    phone;
    loginCode;
    pyProcess;
    buffer;
    constructor(apiId, apiHash, phone, loginCode = null) {
        this.apiId = apiId;
        this.apiHash = apiHash;
        this.phone = phone;
        this.loginCode = loginCode;
        this.pyProcess = null;
        this.buffer = "";
    }
    start() {
        return new Promise((resolve, reject) => {
            const pyPath = path.join(__dirname, "python_bridge", "tg_calls.py");
            if (!fs.existsSync(pyPath)) {
                return reject("Python bridge not found!");
            }
            const args = [
                pyPath,
                this.apiId,
                this.apiHash,
                this.phone,
            ];
            if (this.loginCode)
                args.push(this.loginCode);
            this.pyProcess = spawn("python", args.map(String), {
                stdio: ["pipe", "pipe", "pipe"],
            });
            let buffer = "";
            this.pyProcess.stdout.on("data", (data) => {
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
            this.pyProcess.stderr.on("data", (err) => console.error(`[PYTHON ERR]: ${err.toString().trim()}`));
            this.pyProcess.on("exit", (code) => {
                if (!buffer.includes("Ready To Stream"))
                    reject("Python bridge exited before ready");
            });
            this.pyProcess.on("error", (err) => reject(err));
        });
    }
    // Send PLAY command to Python
    play(chatId, url) {
        if (!this.pyProcess)
            return;
        this.pyProcess.stdin.write(`PLAY ${chatId} ${url}\n`);
    }
    // Send SKIP command to Python
    skip(chatId) {
        if (!this.pyProcess)
            return;
        this.pyProcess.stdin.write(`SKIP ${chatId}\n`);
    }
    // Send STOP command to Python
    stop(chatId) {
        if (!this.pyProcess)
            return;
        this.pyProcess.stdin.write(`STOP ${chatId}\n`);
    }
    // ✅ Play a song by name using YouTube search
    async playByName(chatId, songName) {
        if (!this.pyProcess)
            throw new Error("Python bridge not started");
        const url = await this.getYouTubeUrl(songName);
        console.log(`🎵 Playing "${songName}" -> ${url}`);
        this.play(chatId, url);
    }
    // Helper: search YouTube safely
    async getYouTubeUrl(songName) {
        const result = await yts(songName);
        if (result &&
            result.videos &&
            result.videos.length > 0 &&
            result.videos[0] &&
            result.videos[0].url) {
            return result.videos[0].url;
        }
        throw new Error(`Song "${songName}" not found on YouTube`);
    }
    // ✅ Optional: list groups/channels
    listGroups() {
        return new Promise((resolve, reject) => {
            if (!this.pyProcess)
                return reject("Python bridge not started");
            const onData = (data) => {
                const msg = data.toString();
                if (msg.startsWith("GROUPS_LIST:")) {
                    const jsonStr = msg.replace("GROUPS_LIST:", "").trim();
                    try {
                        const groups = JSON.parse(jsonStr);
                        resolve(groups);
                    }
                    catch (err) {
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
//# sourceMappingURL=index.js.map
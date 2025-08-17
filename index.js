import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class TgVoiceStream {
  constructor(apiId, apiHash, phone, loginCode = null) {
    this.apiId = apiId;
    this.apiHash = apiHash;
    this.phone = phone;
    this.loginCode = loginCode; // new
    this.pyProcess = null;
    this.buffer = "";
    console.log("[DEBUG] TgVoiceStream instance created");
  }

  start() {
    return new Promise((resolve, reject) => {
      const pyPath = path.join(__dirname, "python_bridge", "tg_calls.py");
      console.log(`[DEBUG] Python bridge path: ${pyPath}`);

      if (!fs.existsSync(pyPath)) {
        console.error("[DEBUG] Python bridge not found at path!");
        return reject("Python bridge not found");
      }

      console.log("[DEBUG] Spawning Python process...");
      const args = [pyPath, this.apiId, this.apiHash, this.phone];
      if (this.loginCode) args.push(this.loginCode); // pass code if exists

      this.pyProcess = spawn("python", args, {
        stdio: ["pipe", "pipe", "pipe"],
      });

      let buffer = "";
      this.pyProcess.stdout.on("data", (data) => {
        buffer += data.toString();
        console.log(`[PYTHON STDOUT]: ${data.toString().trim()}`);
        if (buffer.includes("READY")) {
          console.log("✅ Python bridge is ready!");
          resolve(true);
        }
      });

      this.pyProcess.stderr.on("data", (err) =>
        console.error(`[PYTHON STDERR]: ${err.toString().trim()}`)
      );

      this.pyProcess.on("exit", (code) => {
        console.log(`[DEBUG] Python exited with code: ${code}`);
        if (!buffer.includes("READY"))
          reject("Python bridge exited before ready");
      });

      this.pyProcess.on("error", (err) => reject(err));
    });
  }
}

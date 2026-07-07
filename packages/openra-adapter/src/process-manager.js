import { spawn } from "child_process";
import { existsSync } from "fs";
export class OpenRAProcessManager {
    constructor(config = {}) {
        this.process = null;
        this.health = { lastChecked: 0, alive: false };
        this.config = {
            executable: config.executable || this.getDefaultExecutable(),
            headless: config.headless !== false,
            port: config.port || 9000,
            logLevel: config.logLevel || "info",
            ...config,
        };
    }
    async launch() {
        if (this.process) {
            console.warn("OpenRA already running");
            return;
        }
        const args = this.buildArgs();
        console.log(`Launching OpenRA: ${this.config.executable} ${args.join(" ")}`);
        try {
            this.process = spawn(this.config.executable, args, {
                cwd: this.config.workingDirectory,
                stdio: ["ignore", "pipe", "pipe"],
                detached: false,
            });
            this.process.stdout?.on("data", (data) => {
                const line = data.toString().trim();
                if (line && this.config.logLevel === "debug") {
                    console.log(`[OpenRA stdout] ${line}`);
                }
            });
            this.process.stderr?.on("data", (data) => {
                const line = data.toString().trim();
                if (line) {
                    console.warn(`[OpenRA stderr] ${line}`);
                }
            });
            this.process.on("exit", (code, signal) => {
                console.log(`OpenRA process exited: code=${code}, signal=${signal}`);
                this.process = null;
            });
            // Wait for process to be ready
            await this.waitForReady(5000);
        }
        catch (error) {
            throw new Error(`Failed to launch OpenRA: ${error.message}`);
        }
    }
    async shutdown() {
        if (!this.process)
            return;
        console.log("Shutting down OpenRA gracefully...");
        this.process.kill("SIGTERM");
        // Wait up to 5 seconds for graceful shutdown
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                if (this.process) {
                    console.warn("OpenRA did not shut down gracefully, forcing...");
                    this.process.kill("SIGKILL");
                }
                resolve();
            }, 5000);
            this.process?.once("exit", () => {
                clearTimeout(timeout);
                resolve();
            });
        });
    }
    isAlive() {
        return this.process?.killed === false;
    }
    async healthCheck() {
        const now = Date.now();
        if (now - this.health.lastChecked < 1000) {
            return this.health.alive;
        }
        // Check if process still exists
        const alive = this.isAlive();
        this.health.lastChecked = now;
        this.health.alive = alive;
        return alive;
    }
    async waitForReady(timeoutMs) {
        const startTime = Date.now();
        return new Promise((resolve, reject) => {
            const checkInterval = setInterval(() => {
                if (this.isAlive()) {
                    clearInterval(checkInterval);
                    resolve();
                    return;
                }
                if (Date.now() - startTime > timeoutMs) {
                    clearInterval(checkInterval);
                    reject(new Error("OpenRA process timed out while starting"));
                }
            }, 100);
        });
    }
    buildArgs() {
        const args = [];
        if (this.config.headless) {
            args.push("--headless");
        }
        args.push(`--port=${this.config.port}`);
        if (this.config.logLevel) {
            args.push(`--loglevel=${this.config.logLevel}`);
        }
        return args;
    }
    getDefaultExecutable() {
        // Try common OpenRA installation locations
        const candidates = [
            "/usr/bin/openra",
            "/usr/local/bin/openra",
            "C:\Program Files\OpenRA\OpenRA.exe",
            "C:\Program Files (x86)\OpenRA\OpenRA.exe",
            process.env.OPENRA_PATH,
        ].filter(Boolean);
        for (const candidate of candidates) {
            if (candidate && existsSync(candidate)) {
                return candidate;
            }
        }
        // Default to 'openra' (assume it's in PATH)
        return "openra";
    }
}
//# sourceMappingURL=process-manager.js.map
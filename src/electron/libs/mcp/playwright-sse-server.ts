/**
 * Playwright SSE Server 管理器
 * 用于管理持久化运行的 Playwright MCP Server 进程
 * 通过 SSE 模式连接，实现跨对话保持浏览器状态
 */

import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";
import { MCPBrowserMode } from "./mcp-config.js";

/** SSE Server 状态 */
export type SSEServerStatus = "stopped" | "starting" | "running" | "error";

/** SSE Server 事件 */
export interface SSEServerEvents {
    "status-change": (status: SSEServerStatus, error?: string) => void;
    "ready": (url: string) => void;
    "error": (error: string) => void;
    "log": (message: string) => void;
}

/** SSE Server 配置 */
export interface SSEServerConfig {
    port: number;
    browserMode: MCPBrowserMode;
    userDataDir?: string;
}

/** 默认配置 */
const DEFAULT_CONFIG: SSEServerConfig = {
    port: 8931,
    browserMode: "visible",
};

/**
 * Playwright SSE Server 管理器
 * 单例模式，确保只有一个持久化的 Server 实例
 */
export class PlaywrightSSEServer extends EventEmitter {
    private static instance: PlaywrightSSEServer | null = null;

    private serverProcess: ChildProcess | null = null;
    private config: SSEServerConfig = DEFAULT_CONFIG;
    private status: SSEServerStatus = "stopped";
    private errorMessage?: string;
    private sseUrl?: string;
    private logs: string[] = [];
    private maxLogs = 100;

    private constructor() {
        super();
    }

    /** 获取单例实例 */
    public static getInstance(): PlaywrightSSEServer {
        if (!PlaywrightSSEServer.instance) {
            PlaywrightSSEServer.instance = new PlaywrightSSEServer();
        }
        return PlaywrightSSEServer.instance;
    }

    /** 获取当前状态 */
    public getStatus(): SSEServerStatus {
        return this.status;
    }

    /** 获取 SSE URL（仅在运行时有效） */
    public getSSEUrl(): string | undefined {
        return this.sseUrl;
    }

    /** 获取错误信息 */
    public getErrorMessage(): string | undefined {
        return this.errorMessage;
    }

    /** 获取日志 */
    public getLogs(): string[] {
        return [...this.logs];
    }

    /** 是否正在运行 */
    public isRunning(): boolean {
        return this.status === "running" && this.serverProcess !== null;
    }

    /** 更新状态 */
    private setStatus(status: SSEServerStatus, error?: string): void {
        this.status = status;
        this.errorMessage = error;
        this.emit("status-change", status, error);
    }

    /** 添加日志 */
    private addLog(message: string): void {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${message}`;
        this.logs.push(logEntry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
        this.emit("log", logEntry);
        console.log(`[Playwright SSE] ${message}`);
    }

    /**
     * 启动 SSE Server
     * @param config 配置选项
     * @returns SSE URL
     */
    public async start(config?: Partial<SSEServerConfig>): Promise<string> {
        // 如果已经在运行，直接返回 URL
        if (this.isRunning() && this.sseUrl) {
            this.addLog("Server already running");
            return this.sseUrl;
        }

        // 合并配置
        if (config) {
            this.config = { ...this.config, ...config };
        }

        this.setStatus("starting");
        this.addLog(`Starting Playwright SSE server on port ${this.config.port}...`);

        return new Promise((resolve, reject) => {
            // 构建命令参数
            const args = this.buildArgs();
            this.addLog(`Command: npx ${args.join(" ")}`);

            try {
                // 注意：不要使用 shell: true，否则包含空格的路径会被错误解析
                this.serverProcess = spawn("npx", args, {
                    stdio: ["ignore", "pipe", "pipe"],
                    detached: false,
                });

                let resolved = false;

                // 监听 stdout
                this.serverProcess.stdout?.on("data", (data) => {
                    const output = data.toString().trim();
                    this.addLog(`stdout: ${output}`);

                    // 检测服务器启动成功
                    if (!resolved && this.checkServerReady(output)) {
                        resolved = true;
                        this.sseUrl = `http://localhost:${this.config.port}/sse`;
                        this.setStatus("running");
                        this.addLog(`Server ready at ${this.sseUrl}`);
                        this.emit("ready", this.sseUrl);
                        resolve(this.sseUrl);
                    }
                });

                // 监听 stderr
                this.serverProcess.stderr?.on("data", (data) => {
                    const output = data.toString().trim();
                    this.addLog(`stderr: ${output}`);

                    // 有时候 ready 信息在 stderr 输出
                    if (!resolved && this.checkServerReady(output)) {
                        resolved = true;
                        this.sseUrl = `http://localhost:${this.config.port}/sse`;
                        this.setStatus("running");
                        this.addLog(`Server ready at ${this.sseUrl}`);
                        this.emit("ready", this.sseUrl);
                        resolve(this.sseUrl);
                    }
                });

                // 监听进程错误
                this.serverProcess.on("error", (err) => {
                    this.addLog(`Process error: ${err.message}`);
                    this.setStatus("error", err.message);
                    this.serverProcess = null;
                    if (!resolved) {
                        resolved = true;
                        reject(new Error(`Failed to start server: ${err.message}`));
                    }
                });

                // 监听进程退出
                this.serverProcess.on("exit", (code, signal) => {
                    this.addLog(`Process exited with code ${code}, signal ${signal}`);
                    if (this.status === "running") {
                        // 意外退出
                        this.setStatus("error", `Server exited unexpectedly (code: ${code})`);
                    }
                    this.serverProcess = null;
                    this.sseUrl = undefined;
                });

                // 超时处理 - 如果 10 秒内没有检测到 ready，假定已启动
                setTimeout(() => {
                    if (!resolved && this.serverProcess) {
                        resolved = true;
                        this.sseUrl = `http://localhost:${this.config.port}/sse`;
                        this.setStatus("running");
                        this.addLog(`Server assumed ready at ${this.sseUrl} (timeout)`);
                        this.emit("ready", this.sseUrl);
                        resolve(this.sseUrl);
                    }
                }, 10000);

            } catch (error: any) {
                this.addLog(`Spawn error: ${error.message}`);
                this.setStatus("error", error.message);
                reject(error);
            }
        });
    }

    /**
     * 构建启动参数
     */
    private buildArgs(): string[] {
        const args: string[] = ["-y", "@playwright/mcp@latest"];

        // 添加 port 参数
        args.push("--port");
        args.push(this.config.port.toString());

        // headless 模式
        if (this.config.browserMode === "headless") {
            args.push("--headless");
        }

        // 用户数据目录（需要用引号包裹以处理空格）
        if (this.config.userDataDir) {
            args.push("--user-data-dir");
            args.push(this.config.userDataDir);
        }

        return args;
    }

    /**
     * 检测服务器是否已就绪
     */
    private checkServerReady(output: string): boolean {
        const readyPatterns = [
            "listening",
            "Listening",
            "started",
            "Started",
            "ready",
            "Ready",
            `port ${this.config.port}`,
            `:${this.config.port}`,
            "MCP server",
            "Playwright",
        ];
        return readyPatterns.some((pattern) => output.includes(pattern));
    }

    /**
     * 停止 SSE Server
     */
    public async stop(): Promise<void> {
        if (!this.serverProcess) {
            this.addLog("Server not running");
            return;
        }

        this.addLog("Stopping server...");

        return new Promise((resolve) => {
            if (!this.serverProcess) {
                resolve();
                return;
            }

            const timeout = setTimeout(() => {
                // 强制杀死
                if (this.serverProcess) {
                    this.addLog("Force killing server...");
                    this.serverProcess.kill("SIGKILL");
                }
            }, 5000);

            this.serverProcess.once("exit", () => {
                clearTimeout(timeout);
                this.serverProcess = null;
                this.sseUrl = undefined;
                this.setStatus("stopped");
                this.addLog("Server stopped");
                resolve();
            });

            // 发送终止信号
            this.serverProcess.kill("SIGTERM");
        });
    }

    /**
     * 重启 SSE Server
     */
    public async restart(config?: Partial<SSEServerConfig>): Promise<string> {
        this.addLog("Restarting server...");
        await this.stop();
        return this.start(config);
    }

    /**
     * 更新配置并重启（如果正在运行）
     */
    public async updateConfig(config: Partial<SSEServerConfig>): Promise<void> {
        this.config = { ...this.config, ...config };

        if (this.isRunning()) {
            await this.restart();
        }
    }

    /**
     * 获取当前配置
     */
    public getConfig(): SSEServerConfig {
        return { ...this.config };
    }

    /**
     * 清理资源（应用退出时调用）
     */
    public async cleanup(): Promise<void> {
        await this.stop();
        PlaywrightSSEServer.instance = null;
    }
}

/** 获取 Playwright SSE Server 单例 */
export function getPlaywrightSSEServer(): PlaywrightSSEServer {
    return PlaywrightSSEServer.getInstance();
}

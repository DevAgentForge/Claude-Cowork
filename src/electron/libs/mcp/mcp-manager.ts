/**
 * MCP 配置管理器
 * 负责 MCP Server 配置的管理（启动由 Claude SDK 自动处理）
 */

import { EventEmitter } from "events";
import {
    MCPServerConfig,
    MCPConfigState,
    MCPConfigChangeEvent,
} from "./mcp-config.js";
import { loadMCPConfig, saveMCPConfig, getEnabledServers } from "./mcp-store.js";
import { getPlaywrightSSEServer, PlaywrightSSEServer } from "./playwright-sse-server.js";
import { PLAYWRIGHT_SERVER_ID } from "./builtin-servers.js";

/** MCP Manager 事件类型 */
export interface MCPManagerEvents {
    "config-changed": (event: MCPConfigChangeEvent) => void;
}

/** SDK MCP Server 配置类型（支持 stdio 和 SSE） */
export type SDKMCPServerConfig =
    | { type?: 'stdio'; command: string; args?: string[]; env?: Record<string, string> }
    | { type: 'sse'; url: string; headers?: Record<string, string> };

/**
 * MCP 配置管理器
 * 单例模式，管理 MCP Server 配置
 * 注意：Server 进程由 Claude SDK 自动启动和管理（stdio 模式）
 * 或由 PlaywrightSSEServer 独立管理（SSE 模式）
 */
export class MCPManager extends EventEmitter {
    private static instance: MCPManager | null = null;

    /** 当前配置 */
    private config: MCPConfigState;

    /** Playwright SSE Server 实例 */
    private sseServer: PlaywrightSSEServer;

    private constructor() {
        super();
        this.config = loadMCPConfig();
        this.sseServer = getPlaywrightSSEServer();
    }

    /** 获取单例实例 */
    public static getInstance(): MCPManager {
        if (!MCPManager.instance) {
            MCPManager.instance = new MCPManager();
        }
        return MCPManager.instance;
    }

    /** 重置实例（主要用于测试） */
    public static resetInstance(): void {
        MCPManager.instance = null;
    }

    /** 获取当前配置 */
    public getConfig(): MCPConfigState {
        return this.config;
    }

    /** 重新加载配置 */
    public reloadConfig(): void {
        this.config = loadMCPConfig();
    }

    /** 保存配置 */
    public saveConfig(): void {
        saveMCPConfig(this.config);
    }

    /** 更新配置 */
    public updateConfig(newConfig: MCPConfigState): void {
        this.config = newConfig;
        this.saveConfig();
        this.emit("config-changed", { type: "config-updated" });
    }

    /** 获取已启用的 Servers */
    public getEnabledServers(): MCPServerConfig[] {
        return getEnabledServers(this.config);
    }

    /**
     * 获取 Playwright Server 配置
     */
    public getPlaywrightConfig(): MCPServerConfig | undefined {
        return this.config.servers.find(s => s.id === PLAYWRIGHT_SERVER_ID);
    }

    /**
     * 检查是否需要启动 SSE Server
     */
    public needsSSEServer(): boolean {
        const playwright = this.getPlaywrightConfig();
        return !!playwright?.enabled && !!playwright?.persistBrowser;
    }

    /**
     * 确保 SSE Server 正在运行（如果配置了持久化）
     * @returns SSE URL 或 undefined
     */
    public async ensureSSEServerRunning(): Promise<string | undefined> {
        const playwright = this.getPlaywrightConfig();

        if (!playwright?.enabled || !playwright?.persistBrowser) {
            // 如果不需要 SSE 模式，停止可能运行的 Server
            if (this.sseServer.isRunning()) {
                console.log('[mcp-manager] Stopping SSE server (persistence disabled)');
                await this.sseServer.stop();
            }
            return undefined;
        }

        // 如果已经在运行，直接返回 URL
        if (this.sseServer.isRunning()) {
            return this.sseServer.getSSEUrl();
        }

        // 启动 SSE Server
        console.log('[mcp-manager] Starting SSE server for persistent browser');
        try {
            const url = await this.sseServer.start({
                browserMode: playwright.browserMode || 'visible',
                userDataDir: playwright.userDataDir,
            });
            console.log(`[mcp-manager] SSE server started at ${url}`);
            return url;
        } catch (error) {
            console.error('[mcp-manager] Failed to start SSE server:', error);
            throw error;
        }
    }

    /**
     * 停止 SSE Server
     */
    public async stopSSEServer(): Promise<void> {
        if (this.sseServer.isRunning()) {
            console.log('[mcp-manager] Stopping SSE server');
            await this.sseServer.stop();
        }
    }

    /**
     * 获取 SSE Server 状态
     */
    public getSSEServerStatus(): {
        running: boolean;
        url?: string;
        error?: string;
    } {
        return {
            running: this.sseServer.isRunning(),
            url: this.sseServer.getSSEUrl(),
            error: this.sseServer.getErrorMessage(),
        };
    }

    /**
     * 构建用于 Claude SDK 的 MCP Servers 配置
     * 返回格式符合 SDK 的 mcpServers 选项
     * 如果 Playwright 配置了持久化浏览器，将使用 SSE URL
     */
    public buildSDKConfig(): Record<string, SDKMCPServerConfig> {
        const mcpServers: Record<string, SDKMCPServerConfig> = {};

        for (const server of this.config.servers) {
            if (!server.enabled) continue;

            // 检查是否是 Playwright 且配置了持久化
            if (server.id === PLAYWRIGHT_SERVER_ID && server.persistBrowser) {
                const sseUrl = this.sseServer.getSSEUrl();
                if (sseUrl) {
                    // 使用 SSE URL 连接
                    mcpServers[server.id] = {
                        type: 'sse',
                        url: sseUrl,
                    };
                    console.log(`[mcp-manager] Configured server: ${server.id} (SSE mode at ${sseUrl})`);
                } else {
                    console.log(`[mcp-manager] Skipping server ${server.id}: SSE server not running`);
                }
                continue;
            }

            // 标准 stdio 模式
            if (server.transportType !== 'stdio') {
                console.log(`[mcp-manager] Skipping server ${server.id}: unsupported transport type ${server.transportType}`);
                continue;
            }

            mcpServers[server.id] = {
                type: 'stdio',
                command: server.command,
                args: server.args,
                env: server.env,
            };

            console.log(`[mcp-manager] Configured server: ${server.id} (${server.name}) - stdio mode`);
        }

        return mcpServers;
    }

    /**
     * 构建用于 Claude SDK 的 MCP Servers 配置（异步版本）
     * 会自动启动 SSE Server（如果需要）
     */
    public async buildSDKConfigAsync(): Promise<Record<string, SDKMCPServerConfig>> {
        // 先确保 SSE Server 运行（如果需要）
        await this.ensureSSEServerRunning();

        // 然后构建配置
        return this.buildSDKConfig();
    }

    /**
     * 清理所有资源（应用退出时调用）
     */
    public async cleanup(): Promise<void> {
        await this.sseServer.cleanup();
    }
}

/** 导出单例获取函数 */
export function getMCPManager(): MCPManager {
    return MCPManager.getInstance();
}

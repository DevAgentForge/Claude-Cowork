import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ChildProcess, spawn } from "child_process";
import { join } from "path";

// Simple logger since util.js doesn't export logger
const logger = {
  info: (message: string, ...args: any[]) => console.log(`[MCP] ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`[MCP] ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`[MCP] ${message}`, ...args),
  debug: (message: string, ...args: any[]) => console.debug(`[MCP] ${message}`, ...args),
};

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
}

export interface MCPManagerOptions {
  serverPath?: string;
  serverArgs?: string[];
  enabled?: boolean;
  allowedTools?: string[];
}

export class MCPManager {
  private client: Client | null = null;
  private serverProcess: ChildProcess | null = null;
  private tools: Map<string, MCPTool> = new Map();
  private isInitialized = false;
  private options: MCPManagerOptions;

  constructor(options: MCPManagerOptions = {}) {
    this.options = {
      serverPath: 'desktop-commander',
      serverArgs: ['--no-onboarding'],
      enabled: true,
      allowedTools: [], // empty array means all tools allowed
      ...options
    };
  }

  /**
   * Initialize MCP connection to Desktop Commander server
   */
  async initialize(): Promise<boolean> {
    if (!this.options.enabled) {
      logger.info('MCP integration disabled by configuration');
      return false;
    }

    try {
      logger.info('Starting Desktop Commander MCP server...');

      // Start the MCP server process
      this.serverProcess = spawn(
        this.options.serverPath!,
        this.options.serverArgs!,
        {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, NODE_ENV: 'production' }
        }
      );

      // Handle server process errors
      this.serverProcess.on('error', (error) => {
        logger.error(`MCP server process error: ${error.message}`);
        this.cleanup();
      });

      this.serverProcess.on('exit', (code) => {
        logger.info(`MCP server process exited with code ${code}`);
        this.cleanup();
      });

      // Setup client
      this.client = new Client(
        { name: 'claude-cowork', version: '0.0.2' },
        { capabilities: {} }
      );

      // Connect to server via stdio
      const transport = new StdioClientTransport(this.serverProcess);
      await this.client.connect(transport);

      logger.info('MCP client connected successfully');

      // Load available tools
      await this.loadTools();

      this.isInitialized = true;
      logger.info(`MCP integration initialized with ${this.tools.size} tools`);
      return true;

    } catch (error) {
      logger.error(`Failed to initialize MCP integration: ${error}`);
      this.cleanup();
      return false;
    }
  }

  /**
   * Load available tools from MCP server
   */
  private async loadTools(): Promise<void> {
    if (!this.client) {
      throw new Error('MCP client not initialized');
    }

    try {
      const response = await this.client.listTools();
      for (const tool of response.tools) {
        // Filter tools if allowedTools is specified
        if (this.options.allowedTools && this.options.allowedTools.length > 0) {
          if (!this.options.allowedTools.includes(tool.name)) {
            continue;
          }
        }

        this.tools.set(tool.name, {
          name: tool.name,
          description: tool.description || '',
          inputSchema: tool.inputSchema || {}
        });

        logger.debug(`Registered MCP tool: ${tool.name}`);
      }
    } catch (error) {
      logger.error(`Failed to load MCP tools: ${error}`);
      throw error;
    }
  }

  /**
   * Check if a tool is available through MCP
   */
  hasTool(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  /**
   * Get all available MCP tools
   */
  getTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Execute a tool through MCP
   */
  async executeTool(toolName: string, args: any): Promise<any> {
    if (!this.isInitialized || !this.client) {
      throw new Error('MCP integration not initialized');
    }

    if (!this.hasTool(toolName)) {
      throw new Error(`MCP tool not found: ${toolName}`);
    }

    try {
      logger.debug(`Executing MCP tool: ${toolName}`, args);

      const result = await this.client.callTool({
        name: toolName,
        arguments: args
      });

      logger.debug(`MCP tool ${toolName} executed successfully`);

      // Format result for Claude Agent SDK compatibility
      return {
        content: result.content || [],
        isError: result.isError || false,
        _meta: result._meta || {}
      };

    } catch (error) {
      logger.error(`MCP tool execution failed: ${toolName}`, error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.client) {
      this.client.close().catch(() => {});
      this.client = null;
    }

    if (this.serverProcess) {
      if (!this.serverProcess.killed) {
        this.serverProcess.kill('SIGTERM');
      }
      this.serverProcess = null;
    }

    this.tools.clear();
    this.isInitialized = false;

    logger.info('MCP integration cleaned up');
  }

  /**
   * Check if MCP integration is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.client !== null;
  }
}

// Singleton instance
let mcpManagerInstance: MCPManager | null = null;

export function getMCPManager(): MCPManager {
  if (!mcpManagerInstance) {
    mcpManagerInstance = new MCPManager();
  }
  return mcpManagerInstance;
}

export function initializeMCPManager(options?: MCPManagerOptions): Promise<boolean> {
  const manager = getMCPManager();
  return manager.initialize();
}

export function cleanupMCPManager(): void {
  if (mcpManagerInstance) {
    mcpManagerInstance.cleanup();
    mcpManagerInstance = null;
  }
}
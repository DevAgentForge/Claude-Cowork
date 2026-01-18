# MCP 集成测试指南

## 概述
本文档描述了如何测试Claude-Cowork与DesktopCommanderMCP的集成。集成采用了方案一：MCP客户端嵌入。

## 架构
- **MCP管理器**: `src/electron/libs/mcp-manager.ts`
- **集成点**: `src/electron/libs/runner.ts` 中的 `canUseTool` 回调
- **初始化**: 应用启动时在 `src/electron/main.ts` 中初始化

## 前提条件

### 1. 构建DesktopCommanderMCP
```bash
cd ../DesktopCommanderMCP
npm install
npm run build
```

### 2. 安装Claude-Cowork依赖
```bash
cd ../Claude-Cowork
bun install
```

### 3. 确保DesktopCommanderMCP在PATH中
构建后，`desktop-commander` 命令应该可用。或者，您可以修改MCP管理器配置：

```typescript
// 在main.ts中修改初始化
import { getMCPManager } from "./libs/mcp-manager.js";

// 自定义配置
const mcpManager = getMCPManager();
mcpManager.initialize({
  serverPath: '/path/to/DesktopCommanderMCP/dist/index.js',
  serverArgs: ['--no-onboarding'],
  enabled: true
});
```

## 测试步骤

### 步骤1: 编译Electron代码
```bash
cd Claude-Cowork
bun run transpile:electron
```

检查是否有TypeScript错误：
```bash
npx tsc --project src/electron/tsconfig.json --noEmit
```

### 步骤2: 运行开发模式
```bash
bun run dev
```

### 步骤3: 验证MCP初始化
1. 启动Claude-Cowork应用
2. 查看控制台输出，应该看到：
   - `[MCP] Starting Desktop Commander MCP server...`
   - `[MCP] MCP client connected successfully`
   - `[MCP] MCP integration initialized with X tools`

### 步骤4: 测试MCP工具调用
1. 创建新会话
2. 输入使用Desktop Commander工具的任务，例如：
   - "列出Downloads目录的内容"
   - "读取README.md文件"
   - "搜索包含'function'的TypeScript文件"

3. 验证工具执行：
   - AI应该调用MCP工具（如`list_directory`, `read_file`, `start_search`）
   - 工具结果应该显示在对话中
   - 检查控制台是否有MCP工具执行日志

### 步骤5: 测试错误处理
1. 尝试使用不存在的MCP工具
2. 测试MCP服务器崩溃恢复
3. 测试权限拒绝场景

## 预期行为

### 成功场景
1. **工具发现**: MCP管理器应自动发现DesktopCommanderMCP提供的所有工具
2. **工具执行**: 当AI调用MCP工具时，工具应成功执行并返回结果
3. **结果显示**: 工具结果应正确显示在对话界面中
4. **会话持久化**: MCP工具调用应不影响现有会话管理

### 失败场景
1. **MCP服务器不可用**: 应用应降级运行，不崩溃
2. **工具执行失败**: 错误应妥善处理并显示给用户
3. **权限拒绝**: 如果工具需要权限但被拒绝，应有清晰反馈

## 调试提示

### 日志级别
MCP管理器使用控制台日志，前缀为 `[MCP]`。日志级别：
- `info`: 重要事件（初始化、连接、清理）
- `debug`: 工具注册、执行细节
- `error`: 错误和异常

### 常见问题

1. **MCP服务器启动失败**
   - 检查DesktopCommanderMCP是否已构建
   - 检查`serverPath`配置
   - 查看MCP服务器进程错误输出

2. **工具不显示**
   - 检查MCP连接状态
   - 验证工具列表加载
   - 检查工具名称匹配

3. **工具执行无结果**
   - 检查工具参数格式
   - 验证MCP服务器响应
   - 查看runner.ts中的消息格式转换

## 手动测试用例

### 测试1: 文件系统操作
```
任务: "查看当前目录下的文件"
预期: 调用list_directory工具，显示目录内容
```

### 测试2: 文件读取
```
任务: "读取package.json文件的内容"
预期: 调用read_file工具，显示文件内容
```

### 测试3: 搜索功能
```
任务: "在src目录中搜索'interface'"
预期: 调用start_search工具，显示搜索结果
```

### 测试4: 终端命令
```
任务: "运行'ls -la'命令"
预期: 调用start_process工具，显示命令输出
```

## 性能测试

1. **启动时间**: MCP初始化不应显著增加应用启动时间
2. **工具响应**: MCP工具调用应在合理时间内完成（<5秒）
3. **内存使用**: MCP集成不应导致内存泄漏

## 安全测试

1. **路径验证**: 确保MCP工具遵守allowedDirectories配置
2. **命令过滤**: 验证危险命令被阻止
3. **权限提升**: 确保没有权限提升漏洞

## 回归测试

确保现有功能不受影响：
- Claude Code兼容性
- 会话管理
- 权限控制系统
- 用户界面响应性

## 结论

成功集成后，Claude-Cowork将能够：
1. 使用DesktopCommanderMCP的所有工具
2. 提供增强的文件系统和终端操作能力
3. 保持与Claude Code的完全兼容性
4. 提供统一、一致的用户体验

如遇问题，请检查控制台日志并参考DesktopCommanderMCP文档。
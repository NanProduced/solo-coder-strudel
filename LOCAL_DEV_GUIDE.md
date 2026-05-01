# Strudel 本地开发指南

## 1. 项目概览

Strudel 是 TidalCycles 的 JavaScript 移植版，是一个运行在浏览器中的音乐实时编码（Live Coding）环境。

- 官方站点：<https://strudel.cc>
- 源码仓库：<https://codeberg.org/uzu/strudel/>
- 许可证：AGPL-3.0-or-later
- 架构：pnpm monorepo + Lerna 多包管理 + Astro 网站

## 2. 环境要求

| 软件 | 最低版本 | 推荐版本 | 说明 |
|------|---------|---------|------|
| Node.js | >= 18.0.0 | 20.x 或 22.x | `.nvmrc` 指定 Node 22；CI 使用 Node 20 |
| pnpm | 8.x+ | 9.12.2 | 包管理器，CI 固定为 9.12.2 |
| Git | 最新版 | - | 版本控制 |

### Windows 特别注意

- 推荐使用 PowerShell 7+ 或 Git Bash
- 确保 Node.js 和 pnpm 已加入系统 PATH
- 如遇到脚本执行策略问题：`Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`
- native 模块（sharp、tree-sitter）编译需要 Visual Studio Build Tools（C++ 编译环境）

## 3. 快速启动

```powershell
# 1. 克隆项目
git clone https://codeberg.org/uzu/strudel.git
cd strudel

# 2. 安装依赖
pnpm i

# 3. 启动开发服务器
pnpm dev

# 4. 浏览器访问 http://localhost:4321
```

## 4. 核心命令速查

| 操作 | 命令 |
|------|------|
| 安装依赖 | `pnpm i` |
| 启动开发服务器 | `pnpm dev` / `pnpm start` / `pnpm repl` |
| 运行全部测试 | `pnpm test` |
| 运行测试 UI | `pnpm test-ui` |
| 测试覆盖率 | `pnpm test-coverage` |
| 基准测试 | `pnpm bench` |
| 更新快照 | `pnpm snapshot` |
| 代码格式化 | `pnpm codeformat` |
| 格式检查 | `pnpm format-check` |
| Lint 检查 | `pnpm lint` |
| 全部 CI 检查 | `pnpm check` |
| 构建生产版本 | `pnpm build` |
| 预览构建结果 | `pnpm preview` |
| 启动 OSC 服务 | `pnpm osc` |
| 启动采样服务 | `pnpm sampler` |
| 构建 Tauri 桌面应用 | `pnpm tauri build` |
| 生成 JSDoc 文档 | `pnpm jsdoc` |
| 检查未文档化 API | `pnpm report-undocumented` |

## 5. 项目架构

```
strudel/
├── packages/                    # 核心功能包（npm 发布为 @strudel/*）
│   ├── core/                    # 模式语言核心（Pattern、Hap、Timespan）
│   ├── mini/                    # Mini-notation 解析器（PEG 语法）
│   ├── tonal/                   # 音调/和声/音阶功能
│   ├── transpiler/              # 用户代码转译器
│   ├── webaudio/                # Web Audio API 集成
│   ├── superdough/              # 音频合成引擎（合成器 + 采样器）
│   ├── supradough/              # 高级音频引擎（AudioWorklet）
│   ├── codemirror/              # 编辑器扩展（高亮、补全、主题）
│   ├── repl/                    # REPL Web Component
│   ├── draw/                    # 可视化（pianoroll、spiral）
│   ├── midi/                    # MIDI 输入/输出
│   ├── osc/                     # OSC 通信
│   ├── hydra/                   # 视觉合成集成
│   ├── soundfonts/              # SoundFont 支持
│   ├── xen/                     # 微音程/异调和声
│   ├── edo/                     # 等分音阶（EDO）
│   ├── tidal/                   # TidalCycles Haskell 语法支持
│   ├── csound/                  # Csound 集成
│   ├── gamepad/                 # 游戏手柄输入
│   ├── motion/                  # 设备运动传感器
│   ├── mqtt/                    # MQTT 协议
│   ├── serial/                  # 串口通信
│   ├── mondo/                   # Mondo 模式
│   ├── mondough/                # Mondo + SuperDough 集成
│   ├── hs2js/                   # Haskell -> JS 转换
│   ├── embed/                   # 嵌入式 REPL 脚本
│   ├── sampler/                 # 采样文件服务
│   ├── reference/               # API 参考文档生成
│   ├── desktopbridge/           # Tauri 桌面端桥接
│   ├── web/                     # Web 平台工具
│   └── vite-plugin-bundle-audioworklet/  # Vite 插件：AudioWorklet 打包
├── website/                     # Astro 静态站点（REPL + 文档）
│   ├── src/components/          # UI 组件（Header、REPL、Oven 等）
│   ├── src/content/             # MDX 文档内容
│   └── astro.config.mjs         # Astro 配置
├── src-tauri/                   # Tauri 桌面应用（Rust）
├── examples/                    # 独立示例项目
├── test/                        # 集成测试
├── samples/                     # 音频样本文件
├── vitest.config.mjs            # Vitest 全局配置
├── lerna.json                   # Lerna 多包版本管理
└── pnpm-workspace.yaml          # pnpm 工作区配置
```

### 包依赖关系

```
@strudel/core  <-  @strudel/mini  <-  @strudel/transpiler
      |                |                    |
      +-- @strudel/tonal ------------------+
      +-- @strudel/xen
      +-- @strudel/edo

@strudel/core  <-  superdough  <-  @strudel/webaudio  <-  @strudel/repl
                                                        |
                                              @strudel/codemirror --> REPL UI
```

## 6. 本地调试方法

### 6.1 测试

```powershell
pnpm test              # 运行全部测试
pnpm test-ui           # 打开 Vitest UI 界面
pnpm test-coverage     # 生成覆盖率报告
pnpm snapshot          # 更新测试快照
```

测试框架为 Vitest，配置在根目录 `vitest.config.mjs`。
`vitest.setup.mjs` 会在每个测试后重置全局状态，避免测试间泄漏。

单个包内也可以直接运行测试：

```powershell
cd packages/core
pnpm test
```

### 6.2 代码质量

```powershell
pnpm lint              # ESLint 检查
pnpm format-check      # Prettier 格式检查
pnpm codeformat        # 自动格式化
pnpm check             # 格式 + lint + 测试 全部检查
```

### 6.3 浏览器 DevTools 调试

1. 启动 `pnpm dev` 后在浏览器打开 http://localhost:4321
2. F12 打开 DevTools
3. Console 面板：查看 REPL 执行日志和错误
4. Sources 面板：Vite HMR 支持源码映射，可在 .mjs 文件中设断点
5. Network 面板：检查音频样本加载、API 请求
6. Audio 面板（Chrome）：检查 Web Audio 节点图

### 6.4 VSCode 推荐

- 安装 Prettier 扩展并设为默认格式化器
- 安装 ESLint 扩展
- 安装 Astro 扩展

## 7. 常见问题排查

### 7.1 pnpm i 安装失败

- 确认 Node.js >= 18：`node -v`
- 确认 pnpm 版本：`pnpm -v`
- 清除缓存重试：`pnpm store prune && pnpm i`
- Windows 上 native 模块（sharp、tree-sitter）需要 Visual Studio Build Tools
- 如果只是 sharp 报错，可尝试：`pnpm i --ignore-scripts`

### 7.2 pnpm dev 启动后页面空白

- 确认 prestart 步骤（jsdoc-json 生成）成功，检查根目录是否生成 `doc.json`
- 检查浏览器 Console 是否有模块加载错误
- 清除 Vite 缓存：删除 `node_modules/.vite` 目录后重启
- 确认端口 4321 没有被占用

### 7.3 测试失败

- 确保 `pnpm i` 已成功完成
- 单独运行某个包的测试定位问题：`cd packages/core && pnpm test`
- 快照不匹配时运行 `pnpm snapshot` 更新

### 7.4 修改 packages 代码但不生效

- pnpm workspace symlink 应自动生效，但 Vite 有时需重启
- 重启开发服务器后浏览器硬刷新（Ctrl+Shift+R）

### 7.5 音频无法播放

- 浏览器需要用户交互后才能启用 AudioContext，点击页面任意位置
- 检查浏览器是否阻止了自动播放策略
- 确认音频样本 URL 可访问（默认从远程 CDN 加载）
- 如需本地采样：`pnpm sampler`

### 7.6 Docker 方式运行

```powershell
docker build -t strudel .
docker run -p 4321:4321 strudel
```

## 8. 二次开发建议

1. **从 @strudel/core 开始理解**：包含 Pattern、Hap、Timespan 等基础数据结构
2. **音色/效果迭代**：主要修改 `superdough` 包
3. **REPL 界面修改**：涉及 `website/src/components/` 和 `packages/codemirror/`
4. **新增模式函数**：在对应包中添加函数，JSDoc 注释中标注 `@category` 以便自动补全
5. **修改后务必运行**：`pnpm check` 确保格式、lint 和测试全部通过

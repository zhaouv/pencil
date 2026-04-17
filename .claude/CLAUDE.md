# Pencil - Dots and Boxes Game with AI

点格棋（Dots and Boxes）及其AI实现，支持在线对战。

## Tech Stack

- **JavaScript** (Node.js + browser) — 全部游戏逻辑、服务端、客户端、AI
- **socket.io v2.1.1** — WebSocket在线对战
- 无构建步骤，纯解释型JS

## Project Structure

| File | Role |
|---|---|
| `game.js` | 核心引擎: `Game`类(棋盘/规则/计分)、`gameview`(DOM渲染)、`ReplayController` |
| `gamedata.js` | AI优化棋盘状态: `GameData`类，边分类(EDGE_NOW/EDGE_WILL/EDGE_NOT/EDGE_USED)、连通区域分析 |
| `player.js` | 玩家继承体系: `GamePlayer`→`LocalPlayer`/`NetworkPlayer`/`AIPlayer`→`GreedyRandomAI`→`OffensiveKeeperAI` |
| `treeSearch.js` | `TreeSearchAI`: 模拟驱动的安全步选择 + 判定点吃/让分支比较 |
| `server.js` | Node.js WebSocket服务端 (port 5050)，房间匹配、观战、断线处理 |
| `battle.js` | Node环境下AI对战测试，CLI界面+录像导出(.json/.html) |
| `index.html` | 浏览器UI，表格棋盘 + CSS + 脚本加载 |

## Commands

```bash
npm install                  # 安装依赖 (socket.io)
node server.js               # 启动游戏服务 (port 5050)
node battle.js               # AI对战测试 (默认: OK vs GR 6x6 100局)
node battle.js -1 ok -2 gr -n 100 -x 6 -y 6   # 自定义对战
node battle.js -s -o replay.html               # 交换先后手 + 导出HTML录像
```

## Architecture

### AI Player Hierarchy

```
GamePlayer (base)
  +-- LocalPlayer       (人类玩家，轮到时解锁操作)
  +-- NetworkPlayer     (远程人类，socket.io)
  +-- AIPlayer          (AI基类，维护GameData镜像)
        +-- GreedyRandomAI      (贪心+随机安全步+让最小区域)
              +-- OffensiveKeeperAI  (收官阶段抢先手策略)
        +-- TreeSearchAI        (模拟驱动安全步选择+判定点吃/让比较，81%胜率vs OK)
```

### GameData Edge Classification

- `EDGE_NOW` (1111) — 落子即得分
- `EDGE_WILL` (2222) — 落子会给对手创造三边格
- `EDGE_NOT` (3333) — 安全步，不偏利任何一方
- `EDGE_USED` (-999) — 已落子

### Network Architecture

```
Browser ←socket.io→ server.js
```

## Code Conventions

- 全中文注释和文档
- 无模块打包，浏览器端通过`<script>`标签加载，依赖全局变量
- `GameData`为AI专用的高效棋盘表示，与`Game`的渲染棋盘分离
- socket.io v2.x API（非v4+）
- License: WTFPL

## Known Issues

- `package.json`的`npm test`实际启动server而非运行测试
- `OffensiveKeeperAI.tryKeepOffensive()`面积2长条的边界搜索有时无法找到合适边，打出"bug:理论上不应该走到这里"
- `TreeSearchAI.pickYieldEdge()`对L2长条同样有边界搜索失败问题（和OK同一bug），模拟返回`-Infinity`时退回OK逻辑

## Conventions

- 完成任何阶段后，须同步更新 `.claude/CLAUDE.md` 和 `.claude/plan.md`，保持文档与实际代码一致

# TreeSearchAI 重写计划

## 当前问题分析

`treeSearch.js` 存在以下严重bug和设计缺陷，需要完全重写：

### Bug

1. **`negamax` 调用自身时写成 `negamax(...)` 而非 `this.negamax(...)`** (第55行) — 会导致 ReferenceError，整个搜索完全无法运行
2. **`put()` 每次调用都原地修改 gameData，`recover()` 却只是返回原引用** — 恢复逻辑失效，搜索树的状态会错乱
3. **`gen()` 始终返回 `[[where]]`（单路线单步），搜索退化为单分支** — negamax 在单分支上无意义，等于贪心
4. **`tryKeepOffensive()` 返回值不一致** — 有时返回坐标对象，有时返回路线数组，有时返回 `{x,y}` 字面量，导致后续逻辑无法正确处理
5. **`evaluate()` 中 `ai.gameData` 被 `gameData.clone()` 覆盖但 `ai` 未初始化** — `new OffensiveKeeperAI()` 没有 `init(game)` 调用，其 `gameData` 为 undefined

### 设计缺陷

1. **蒙特卡洛评估太慢** — 每个叶节点跑100局完整游戏，即使 SEARCH_DEPTH=10，分支数为1的情况下也要100次完整模拟
2. **`gen()` 不生成分支** — 当前只生成一条路线，negamax+alpha-beta剪枝毫无意义
3. **缺少置换表** — 注释中标注 `// ?add hash` 但未实现
4. **连续落子链应分段处理** — 大部分吃分是确定性的，只有到达"让分判定点"时才需要搜索分支，不应每步都开分支

## 重写设计

### 核心思路：确定性快进 + 判定点分支

Dots and Boxes 中，当 EDGE_NOW 存在时，大部分情况吃分是唯一正确选择（确定性），只有到达特定"判定点"时才需要思考"吃分 vs 让分抢先手"。

参考 `OffensiveKeeperAI.tryKeepOffensive()` 的逻辑，可以确定性判断当前是否到达判定点：

| 条件 | 决策 |
|---|---|
| 只剩1个连通区域 | 直接吃完（确定性） |
| 有面积1的得分区域 | 吃掉它（确定性） |
| 有面积2的得分区域且还有别的得分区域 | 吃掉它（确定性） |
| 得分区域 > 2个 | 吃一个（确定性） |
| 2个得分区域 | 吃一个（确定性） |
| 唯一得分区域，环且面积≠4 | 吃掉（确定性） |
| 唯一得分区域，非环且面积≠2 | 吃掉（确定性） |
| **唯一得分区域，环且面积=4** | **判定点** |
| **唯一得分区域，非环且面积=2** | **判定点** |

到达判定点时，才开分支搜索：
- **分支A**：吃分 → 继续轮到自己，吃完后交出回合
- **分支B**：让分抢先手 → 走 EDGE_WILL，交出回合但保持先手

**一个"着法"是复合动作**：确定性吃分链（可能为空）+ 最终一步（分支点或换手步）。negamax 的每个节点就是一个这样的复合着法。

### 步骤1：实现 `isDecisionPoint()` — 判定是否到达让分判定点

```js
TreeSearchAI.prototype.isDecisionPoint = function(gameData) {
    // 只有在 EDGE_NOW 存在且 EDGE_NOT 为0（进入收官）时才需判断
    if (gameData.edgeCount[gameData.EDGE_NOW] === 0) return false
    if (gameData.edgeCount[gameData.EDGE_NOT] > 0) return false

    // 只剩最后一个连通区域，且不是1个区域直接吃（regionNum==1时直接吃）
    if (gameData.regionNum === 1) return false

    // 检查 tryKeepOffensive 的逻辑：
    // 如果所有条件都不满足"直接吃"，则到达判定点
    // 即：只有1个得分区域，且是面积4的环或面积2的长条

    if (gameData.scoreRegion.length !== 1) return false

    var region = gameData.connectedRegion[gameData.scoreRegion[0]]
    if (!region) return false

    // 面积4的环 → 判定点
    if (region.isRing && region.block.length === 4) return true
    // 面积2的长条 → 判定点
    if (!region.isRing && region.block.length === 2) return true

    return false
}
```

### 步骤2：实现 `eatUntilDecision()` — 确定性快进吃分链

从当前局面开始，按 tryKeepOffensive 的确定性逻辑一直吃到无法继续或到达判定点。返回复合着法和结果局面。

```js
// 返回 { way: [{x,y}, ...], gameData: 吃完后的局面, atDecisionPoint: bool }
TreeSearchAI.prototype.eatUntilDecision = function(gameData) {
    var way = []
    var sim = gameData.clone()

    while (sim.edgeCount[sim.EDGE_NOW] > 0 && sim.winnerId == null) {
        if (this.isDecisionPoint(sim)) {
            return { way: way, gameData: sim, atDecisionPoint: true }
        }
        // 确定性吃分：按 tryKeepOffensive 逻辑选择吃哪条
        var edge = this.pickEatableEdge(sim)
        way.push(edge)
        sim.putxy(edge.x, edge.y)
    }

    return { way: way, gameData: sim, atDecisionPoint: false }
}

// 确定性选择当前该吃的边（复用 tryKeepOffensive 的全部确定性逻辑）
TreeSearchAI.prototype.pickEatableEdge = function(gameData) {
    // 最后一个区域：直接吃
    if (gameData.regionNum === 1) {
        return gameData.getOneEdgeFromRegionIndex(gameData.scoreRegion[0])
    }
    // 按大小分类
    var regions = {}
    for (var ii in gameData.connectedRegion) {
        var region = gameData.connectedRegion[ii]
        if (!region) continue
        var len = region.block.length
        regions[len] = regions[len] || []
        regions[len].push(region.index)
    }
    // 有得分单块
    if (regions[1]) {
        for (var ii = 0; ii < regions[1].length; ii++) {
            if (gameData.scoreRegion.indexOf(regions[1][ii]) !== -1)
                return gameData.getOneEdgeFromRegionIndex(regions[1][ii])
        }
    }
    // 有得分双块且还有别的得分区域
    if (regions[2] && gameData.scoreRegion.length > 1) {
        for (var ii = 0; ii < regions[2].length; ii++) {
            if (gameData.scoreRegion.indexOf(regions[2][ii]) !== -1)
                return gameData.getOneEdgeFromRegionIndex(regions[2][ii])
        }
    }
    // 多于两个得分区域：先吃环
    if (gameData.scoreRegion.length > 2) {
        for (var ii in gameData.scoreRegion) {
            var region = gameData.connectedRegion[gameData.scoreRegion[ii]]
            if (region.isRing) return gameData.getOneEdgeFromRegion(region)
        }
        return gameData.getOneEdgeFromRegionIndex(gameData.scoreRegion[0])
    }
    // 两个得分区域且第二个是环
    if (gameData.scoreRegion.length === 2
        && gameData.connectedRegion[gameData.scoreRegion[1]].isRing)
        return gameData.getOneEdgeFromRegionIndex(gameData.scoreRegion[1])
    // 两个得分区域
    if (gameData.scoreRegion.length === 2)
        return gameData.getOneEdgeFromRegionIndex(gameData.scoreRegion[0])

    // 唯一得分区域，但不是判定点（面积大的情况）：吃
    return gameData.getOneEdgeFromRegionIndex(gameData.scoreRegion[0])
}
```

### 步骤3：重写 `gen()` — 基于判定点的分支生成

```js
// 返回 [{ way: [{x,y},...], type: 'eat'|'yield'|'safe'|'forced_yield' }, ...]
TreeSearchAI.prototype.gen = function(gameData) {
    var ways = []

    if (gameData.edgeCount[gameData.EDGE_NOW] > 0) {
        // 先快进确定性吃分链
        var result = this.eatUntilDecision(gameData)

        if (result.atDecisionPoint) {
            // 判定点：分支A 吃分，分支B 让分抢先手
            var region = result.gameData.connectedRegion[result.gameData.scoreRegion[0]]
            // 分支A：吃掉判定区域的边
            var eatEdge = result.gameData.getOneEdgeFromRegion(region)
            ways.push({
                way: result.way.concat([eatEdge]),
                type: 'eat'
            })
            // 分支B：让分抢先手，走一条 EDGE_WILL 边
            // 对判定区域，走一个不会让对手立即得分但交出先手的边
            var yieldEdge = this.pickYieldEdge(result.gameData, region)
            if (yieldEdge) {
                ways.push({
                    way: result.way.concat([yieldEdge]),
                    type: 'yield'
                })
            }
        } else {
            // 不在判定点，确定性吃分链就是唯一着法
            ways.push({
                way: result.way,
                type: 'eat'
            })
        }
    } else if (gameData.edgeCount[gameData.EDGE_NOT] > 0) {
        // 安全步：每个安全边是一个分支
        var edges = gameData.getAllEdges(gameData.EDGE_NOT)
        for (var ii = 0; ii < edges.length; ii++) {
            ways.push({ way: [edges[ii]], type: 'safe' })
        }
    } else {
        // 必须让分：按区域分组
        var regionEdges = gameData.getEdgeGroupedByRegion()
        for (var ii = 0; ii < regionEdges.length; ii++) {
            ways.push({ way: [regionEdges[ii]], type: 'forced_yield' })
        }
    }

    return ways
}
```

**分支爆炸控制**：EDGE_NOT 过多时（开局阶段），可按启发式排序取 top-N 或按连通区域分组采样。

### 步骤4：实现 `pickYieldEdge()` — 判定点的让分边选择

在判定点（面积4的环 / 面积2的长条），选择哪条 EDGE_WILL 边来让分：

```js
TreeSearchAI.prototype.pickYieldEdge = function(gameData, region) {
    var stack = region.block
    // 面积4的环：走中间的对边，把4格环分成2+2交给对手
    if (region.isRing && region.block.length === 4) {
        return { x: (stack[1].x + stack[2].x) / 2, y: (stack[1].y + stack[2].y) / 2 }
    }
    // 面积2的长条：走边界外侧的 EDGE_WILL 边
    if (!region.isRing && region.block.length === 2) {
        var p1 = gameData.xy(stack[0].x, stack[0].y) !== gameData.SCORE_3 ? 0 : 1
        var directions = [{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}]
        for (var ii = 0, d; d = directions[ii]; ii++) {
            var xx = stack[p1].x + d.x, yy = stack[p1].y + d.y
            var xxx = stack[p1].x + 2*d.x, yyy = stack[p1].y + 2*d.y
            if (gameData.xy(xx, yy) !== gameData.EDGE_USED
                && gameData.xy(xxx, yyy) === 'out range')
                return { x: xx, y: yy }
        }
    }
    return null  // 不应到达此处
}
```

### 步骤5：重写 `negamax()` — 处理复合着法

```js
TreeSearchAI.prototype.negamax = function(gameData, deep, alpha, beta) {
    this.negamax_count++
    if (gameData.winnerId != null) {
        return gameData.winnerId === this.playerId ? this.WIN_SCORE : -this.WIN_SCORE
    }
    if (deep <= 0) return this.evaluate(gameData)

    var best = -Infinity
    var ways = this.gen(gameData)

    for (var ii = 0; ii < ways.length; ii++) {
        // 执行复合着法：在 clone 上依次走 way 中的每一步
        var newGameData = gameData.clone()
        var lastResult
        for (var jj = 0; jj < ways[ii].way.length; jj++) {
            var step = ways[ii].way[jj]
            lastResult = newGameData.putxy(step.x, step.y)
            if (lastResult === 'win') break
        }

        var value
        if (lastResult === 'continueTurn') {
            // 复合着法走完仍轮到自己（不应发生在判定点分支中）
            value = this.negamax(newGameData, deep, alpha, beta)
        } else {
            // 换手或胜利，切换视角
            value = -this.negamax(newGameData, deep - 1, -beta, -alpha)
        }

        if (value > best) {
            best = value
            this.bestWay = ways[ii].way[0]  // 记录第一步（实际落子）
            if (best === this.WIN_SCORE) return best
        }
        alpha = Math.max(best, alpha)
        if (value >= beta) {
            this.ABcut++
            return value
        }
    }
    return best
}
```

**depth 语义**：每次换手 depth-1。确定性吃分链不消耗 depth（因为是快进）。只有对手的回合才消耗搜索深度。

### 步骤6：在 GameData 中添加辅助方法

`gamedata.js` 中添加：

```js
GameData.prototype.getAllEdges = function(number) {
    var edges = []
    for (var jj = 0; jj < 2 * this.ysize + 1; jj++) {
        for (var ii = 0; ii < 2 * this.xsize + 1; ii++) {
            if (this.xy(ii, jj) === number) {
                edges.push({x: ii, y: jj})
            }
        }
    }
    return edges
}

GameData.prototype.getEdgeGroupedByRegion = function() {
    var result = []
    for (var ii in this.connectedRegion) {
        var region = this.connectedRegion[ii]
        if (!region) continue
        var edge = this.getOneEdgeFromRegion(region)
        if (edge) result.push(edge)
    }
    return result
}
```

### 步骤7：替换评估函数

蒙特卡洛评估太慢且方差大。改为基于局面特征的静态评估：

```js
TreeSearchAI.prototype.evaluate = function(gameData) {
    if (gameData.winnerId === this.playerId) return this.WIN_SCORE
    if (gameData.winnerId === 1 - this.playerId) return -this.WIN_SCORE

    var myScore = gameData.player[this.playerId].score
    var oppScore = gameData.player[1 - this.playerId].score
    var scoreDiff = myScore - oppScore

    // 先手优势：当前能得分的边数越多越好
    var offensive = gameData.edgeCount[gameData.EDGE_NOW]
    // 安全步数量
    var safe = gameData.edgeCount[gameData.EDGE_NOT]

    // 连通区域分析
    var myRegions = 0, oppRegions = 0
    // ... 根据区域大小和类型计算

    return scoreDiff * 0.5 + offensive * 0.3 + safe * 0.1 + ...
}
```

如果静态评估不够准确，可以保留蒙特卡洛作为可选项，但大幅降低次数（如10次而非100次）。

### 步骤8：可选 — 添加置换表

```js
TreeSearchAI.prototype.hash = function(gameData) {
    // 基于 map 的 Zobrist hashing
    // 棋盘大小固定时可预计算随机数表
}

TreeSearchAI.prototype.negamax = function(gameData, deep, alpha, beta) {
    var hash = this.hash(gameData)
    var entry = this.hashTable[hash]
    if (entry && entry.deep >= deep) return entry.value

    // ... 搜索逻辑 ...

    this.hashTable[hash] = {deep: deep, value: best}
    return best
}
```

## 阶段0：Node 环境对战测试框架 ✅ 已完成

通过 `vm` 模块模拟浏览器全局环境加载源文件，零修改现有代码。

### 实现方式

- 新建 `battle.js`，用 `vm.createContext` + `vm.runInContext` 加载 `game.js`/`gamedata.js`/`player.js`
- AI 对局直接在 `GameData` 上运行（`ai.gameData = gd` + `ai.where()` + `gd.putxy()`），无需 DOM
- 不给现有文件添加 `module.exports`/`require`，避免影响浏览器加载

### CLI 界面

```
node battle.js [options]
  -1, --ai1 <name>    先手AI (ok|gr)    default: ok
  -2, --ai2 <name>    后手AI (ok|gr)    default: gr
  -x, --xsize <n>     棋盘宽             default: 6
  -y, --ysize <n>     棋盘高             default: 6
  -n, --rounds <n>    局数               default: 100
  -o, --output <file> 录像输出 (.json/.html)
  -s, --swap          交换先后手再跑一轮
  -h, --help          帮助
```

AI 名称映射: `gr`→GreedyRandomAI, `ok`→OffensiveKeeperAI

### 录像导出

- `-o replay.json`：JSON 格式，含每局 `history: [[x,y,playerId],...]`，可在浏览器控制台加载到 `ReplayController`
- `-o replay.html`：自包含 HTML，内联游戏代码+录像数据，浏览器打开即可选择对局播放

### 验证结果

OffensiveKeeperAI vs GreedyRandomAI 6x6 综合胜率约 89%（先手88%，后手89%）

## 实施顺序

| 序号 | 内容 | 文件 | 状态 |
|---|---|---|---|
| ~~0~~ | ~~阶段0：Node对战测试框架~~ | `battle.js` | ✅ |
| ~~1~~ | ~~实现 `isDecisionPoint()` 判定逻辑~~ | `treeSearch.js` | ✅ |
| ~~2~~ | ~~实现 `eatUntilDecision()` + `pickEatableEdge()` 确定性快进~~ | `treeSearch.js` | ✅ |
| ~~3~~ | ~~实现 `pickYieldEdge()` 判定点让分选择~~ | `treeSearch.js` | ✅ |
| ~~4~~ | ~~添加 `getAllEdges`、`getEdgeGroupedByRegion`~~ | `gamedata.js` | ✅ |
| ~~5~~ | ~~重写 `gen()` 基于判定点的分支生成~~ | `treeSearch.js` | ✅ |
| ~~6~~ | ~~重写 `negamax()` 处理复合着法~~ | `treeSearch.js` | ✅ |
| ~~7~~ | ~~替换评估函数~~ | `treeSearch.js` | ✅ |
| 8 | 可选：置换表 | `treeSearch.js` | 跳过 |
| ~~9~~ | ~~用 battle.js 测试~~ | `battle.js` | ✅ |

## 实际实现方案（与原计划的差异）

原计划使用 negamax + alpha-beta 搜索 + 判定点分支。实际实现中发现：

1. **negamax搜索太慢**：simulation-based评估每个叶节点需200步模拟，node limit很容易触顶
2. **链分析评估不正确**：D&B收官链的动力学太复杂，静态评估0%正确率
3. **判定点分支比较不够**：L2/R4决策点模拟仅把胜率从51%提到51%，因为OK已在此处做对

**最终方案：模拟驱动的安全步选择**，这是关键突破：

- OK在EDGE_NOT阶段随机走安全步，而TS模拟每个安全步的终局结果选最优
- 安全步选择决定了收官链结构，正确选择可获巨大先手优势
- `pickBestSafeMove()`: 对每个EDGE_NOT边，clone后模拟OK对局到终局，选得分差最大的
- 采样上限15个安全步，避免开局模拟过多
- 判定点吃/让比较保留作为额外优化

### 关键方法

| 方法 | 作用 |
|---|---|
| `where()` | 主入口：收官判定点→安全步模拟→吃分→让分 |
| `pickBestSafeMove()` | 模拟每个安全步到终局，选最优 |
| `simulateBranch()` | 判定点吃/让分支模拟 |
| `simulateToEnd()` | OK策略模拟到终局 |
| `isDecisionPoint()` | L2长条/R4环判定 |
| `pickYieldEdge()` | 判定点让分边选择 |
| `pickEatableEdge()` | 确定性吃分顺序 |

### 保留但未使用的方法

`negamax()`, `gen()`, `evaluate()`, `eatUntilDecision()` 仍保留在文件中，当前未被 `where()` 调用。未来可用于更深层搜索。

## 验证结果

```bash
node battle.js -1 ts -2 ok -n 100 -s
```

| 对战 | 胜率 |
|---|---|
| TS vs OK (6x6, 200局, 交换先后手) | **81%** |
| TS vs OK (5x5, 100局, 交换先后手) | **81%** |
| TS vs GR (6x6, 100局, 交换先后手) | **92%** |

目标 >80% ✅ 达成

---

**完成任何阶段后，须同步更新 `.claude/CLAUDE.md` 和 `.claude/plan.md`，保持文档与实际代码一致。**

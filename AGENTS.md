# AGENTS.md

## 项目概况

- 项目是一个点格棋（Dots and Boxes）实现，包含浏览器界面、Node.js 网络对战服务和若干 AI。
- 代码风格是老式全局脚本，不使用构建工具、模块打包器、测试框架，也没有 lockfile。
- 运行时主要分两类：
  - 浏览器端：`index.html` 直接加载脚本。
  - Node 端：`server.js`、`aivsai.js`。

## 主要文件职责

- `index.html`
  - 主页面，直接提供本地对局、AI 对局、网络对战入口。
  - 依赖 `game.js`、`gamedata.js`、`player.js`、`treeSearch.js` 和 `socket.io/socket.io.js`。
- `game.js`
  - 核心棋盘规则 `Game`。
  - 浏览器 UI 控制 `gameview`。
  - 录像回放控制器 `ReplayController`。
- `gamedata.js`
  - 从 `Game` 派生给 AI 使用的盘面数据结构 `GameData`。
  - 维护边分类、联通区域、区域取边、安全步结构分析，以及 Phase 4 结构评估特征抽取等 AI 辅助能力。
  - 当前 `getScoreRegions()` 已改成按实时区域扫描 `SCORE_3`，不再信任 live 增量路径里可能漂移的原始 `scoreRegion` 列表。
  - 当前已额外支持“最后一个结构机会”的显式摘要，能区分 `owner / handoff / beneficiary`；beneficiary 只在显式请求 `getStructureOpportunitySummary(null, true)` 时计算，并复用按 `playerId` 共享的局部 exact cache，避免拖慢常规搜索路径。
- `player.js`
  - 玩家抽象 `GamePlayer`。
  - 本地玩家、网络玩家、AI 基类。
  - `GreedyRandomAI` 和 `OffensiveKeeperAI`。
- `treeSearch.js`
  - `TreeSearchAI` 的实验性搜索实现。
  - 当前版本使用 clone-based 回合级路线搜索、alpha-beta、迭代加深、TT、结构评估和无安全步精确收官求解。
  - 已能稳定生成“全吃 / 留最后一口 / 双格链让分 / 四环让分”这类基础路线，并带有“连续无关步快进”和收官延伸搜索骨架。
  - `GameData` 侧已补状态缓存和定制 `clone()`；当前无安全步精确收官分支已改成“结构指纹去重 + 精确搜索”，并开始在 `control` 存在时跳过同区域的 `stopBeforeLast`，同时补了带 `exact / lower / upper` 的 exact TT，并把“根结点无安全步”切到 exact 路线集，修掉了一个 ring4 让分选错、一个根结点让分被普通候选上限截断、一个“小得分区存在 `EDGE_NOW` 但 score route 为空”的候选缺口、一个 live `scoreRegion` 漂移导致 exact score route 直接为空的查询缺口，以及“长链 / 长环只会在 `chain2 / ring4` 才生成 `score-control`”的枚举缺口；本轮又把“小安全边数 late endgame”正式接进 `searchState / searchQuiescence`，当前精确窗口为 `EDGE_NOT <= 5`，补了“小链让分时优先选中间边而不是边界边”的 tie-break，把结构机会的 `owner / handoff` 摘要低成本接进了 `evaluateStructure()`，把 beneficiary 窄接到了 `safe 4 -> 2` 的 safe route ordering，并在 `safe=0` 的 exact sacrifice root 上新增 simple 闭区域 representative canonical：对 simple chain/ring 闭区域统一只保留按闭区域路径顺序的“第二条边”作为代表；若命中 `ok` 赢线首手，则该闭区域的代表边会整体获得排序加成；强度和性能仍未达标。
- `server.js`
  - `socket.io` 对战服务器，默认监听 `5050`。
  - 管理随机匹配、指定房间、观战和棋谱广播。
- `aivsai.js`
  - Node CLI，用于 AI vs AI 批量对战、带 seed 的可复现对局和录像导出。
  - 当前还支持 `--late-trace <file>` 和 `--trace-safe-max <n>`，可在对局运行过程中逐行记录指定 `safeEdgeCount` 窗口内的实际路径；即使外部用 `timeout` 提前终止，也能保留已采到的 trace。
- `ts_cases.js`
  - Node 下的固定局面回归脚本，用于检查 `TreeSearchAI` 的结构评估特征、无安全步收官判断、关键让分选择和 exact score prefix 假设。

## 实际可用入口

### 1. 纯本地 AI 对战

当前最容易验证的入口是：

```bash
node aivsai.js -1 ok -2 gr -n 1 -s --seed 123
```

已实际跑通，输出结果为：

```text
OffensiveKeeperAI(先手) vs GreedyRandomAI(后手) 6x6 1局
随机种子: 123
结果: OK 1胜 GR 0负
平均步数: 77

GreedyRandomAI(先手) vs OffensiveKeeperAI(后手) 6x6 1局
结果: OK 1胜 GR 0负
平均步数: 79

综合 2局: OK 2胜 GR 0负 (100%)
```

### 2. 网络对战服务

目标运行方式仍然是：

```bash
npm install
node server.js
```

但当前工作区尚未安装依赖，所以这条路径还没有在本地重新验证。

## 已验证结果

- 已验证核心脚本可被 Node 正常加载：

```bash
node -e "require('./game.js'); require('./gamedata.js'); require('./player.js'); require('./treeSearch.js'); console.log('core ok')"
```

- 已验证 `aivsai.js` 在默认 AI 组合下可运行。
- 已验证 `aivsai.js` 已支持 `--seed <n>`：
  - 可固定 `Math.random`
  - 录像导出的 JSON / HTML 配置和单局结果里会保留 seed
- 已验证可复现样本：
  - `node aivsai.js -1 ok -2 gr -n 1 -s --seed 123`
  - 当前固定输出为 `OK 2胜 GR 0负 (100%)`
- 已验证 `TreeSearchAI` 现在可以完整跑完对局，不再是一上来就报错的原型状态。
- 已验证 `TreeSearchAI` 的回合级路线 + 搜索核心版本至少能稳定跑完最小回归：
  - `node aivsai.js -1 ts -2 gr -n 1`
  - `node aivsai.js -1 ts -2 ok -n 1`
- 已验证 `ts_cases.js` 固定局面回归可通过：
  - `node ts_cases.js`
  - 其中 `ring4_sacrifice_choice` 当前会固定选出 `2,1`
  - 其中 `exact_root_sacrifice_choice` 当前会固定选出 `8,1`
  - 其中 `late_safe_window_choice` 当前会固定选出 `11,12`（同指纹等价代表边）
  - 其中 `late_structure_opportunity_handoff_after_12_11` 当前会固定识别为 `lastOpportunityOwnerSign=-1 / lastOpportunityBeneficiarySign=-1`
  - 其中 `exact_sacrifice_simple_region_canonicalization` 当前会固定体现“simple 闭区域统一只保留第二条边代表”
  - 其中 `small_chain_sacrifice_middle_preference` 当前会固定选出 `11,6`
  - 其中 `score_then_small_chain_middle_route` 当前会固定生成 `3,12 -> 11,6`
- `exact_score_prefix_control_only` 当前会固定保持：
  - 普通 score prefixes 为 `score-all / score-stop / score-control`
  - exact score prefixes 为 `score-all / score-control`
- `boundary_chain_ring_score_prefix` 当前会固定保持：
  - 普通 score prefixes 为 `score-all / score-stop`
  - exact score prefixes 为 `score-all / score-stop`
- `live_ring8_score_prefix` 当前会固定保持：
  - 通过 `GameData.putxy()` 连续推进后，普通 score prefixes 为 `score-all / score-stop / score-control`
  - 通过 `GameData.putxy()` 连续推进后，exact score prefixes 为 `score-all / score-control`
- 已验证来自 `test_record.md` 的让分节点：
  - 在 `[2,11,0] -> [3,12,1]` 之后，当前 `TreeSearchAI` 会把 `L2` 的中间边 `[11,6]` 排到 `[12,5] / [9,12] / [10,9]` 之前
  - 对应的完整两手路线也已固定：当前 `where()` 会缓存 `3,12 -> 11,6`，不再出现 `3,12 -> 9,12`
- 已验证单局 spot check：
  - `node aivsai.js -1 ts -2 ok -n 1 --seed 1` 为 `1:0`，平均步数 `67`
  - `node aivsai.js -1 ts -2 ok -n 1 --seed 4` 为 `1:0`，平均步数 `80`
  - `node aivsai.js -1 ts -2 ok -n 1 --seed 8` 为 `1:0`，平均步数 `72`
  - `node aivsai.js -1 ts -2 ok -n 1 --seed 123` 为 `1:0`，平均步数 `71`
  - 当前 `time node aivsai.js -1 ts -2 ok -n 1 --seed 1` 约 `17.7s`
  - 当前 `time node ts_cases.js` 约 `25.3s`
  - `node aivsai.js -1 ts -2 ok -n 1 --seed 1 --late-trace /tmp/pencil_seed1_trace12.jsonl --trace-safe-max 12` 可正常完成，并写出 `29` 条 trace
  - `timeout 20s node aivsai.js -1 ts -2 ok -n 1 --seed 7 --late-trace /tmp/pencil_seed7_trace12.jsonl --trace-safe-max 12` 会超时，且 trace 为 `0` 条
  - `timeout 20s node aivsai.js -1 ts -2 ok -n 1 --seed 7 --late-trace /tmp/pencil_seed7_trace20.jsonl --trace-safe-max 20` 会超时，但已写出 `2` 条 trace；当前只走到 `ply=34/35`、`safe=20/18`
- 已验证短样本基准：
  - 上一轮 2+2 自定义短样本基线为：
    - `ts vs ok` 为 `1:3`
    - `ts vs gr` 为 `2:2`
  - 上一提交已在“`--seed`、无安全步精确收官直切 exact、`exact_root_sacrifice_choice` 回归、根结点无安全步 exact 路线集、live `scoreRegion` 查询实时扫描、长链 / 长环 `score-control` prefix 补齐”后重跑过同口径 2+2 自定义短样本：
    - `node aivsai.js -1 ts -2 ok -n 2 -s --seed 1` 为 `4:0`
    - `node aivsai.js -1 ts -2 gr -n 2 -s --seed 123` 为 `4:0`
  - 本轮又补了“小安全边数 late endgame 接 exact，`EXACT_SAFE_EDGE_LIMIT` 提到 `5`”和 `late_safe_window_choice` 回归，并把新发现的 `seed=8` 固定输局翻成赢局
  - 当前版本已重跑：
    - `node aivsai.js -1 ts -2 ok -n 2 -s --seed 1` 为 `4:0`，总耗时约 `9m48s`
  - 当前版本对 `gr` 尚未重跑同口径 2+2
  - 当前观测到的单点最大 exact 分支有过 `43 -> 26` 的收缩，但最新整局 spot check 仍会遇到 `40` 路左右的 exact 状态
  - 说明当前版本已经从“Phase 4 初版已接入”推进到“固定输局 seed 已被继续翻正、短样本曾翻到可赢，但 exact 内部仍有缺口且性能仍偏慢”的阶段
- 未验证浏览器页面、网络对战、观战流程。
- `package.json` 里的 `npm test` 不是测试套件，只是直接运行 `node server.js`，会常驻阻塞。

## 已知问题

### 1. `TreeSearchAI` 距目标强度仍有明显差距

最小验证：

```bash
node aivsai.js -1 ts -2 ok -n 5 -s
```

当前 `TreeSearchAI` 已经进入“回合级路线搜索 + 搜索核心优化 + Phase 4 结构评估初版”的下一阶段，但还没有达到计划里的目标：

- 目标是对 `ok` 达到 `80%` 胜率
- 虽然当前版本已重跑 `ts vs ok` 的 2+2 自定义短样本并保持：
  - 对 `ok` 为 `4:0`
- 且上一提交里 `ts vs gr` 的同口径 2+2 也为 `4:0`
- 但样本仍然很小，且当前版本对 `gr` 尚未重跑，同样不能把当前版本视为已经达到长期稳定的 `80%` 目标
- 说明“候选单位升级”“搜索内核升级”和“评估显式化”都已开始见效，但“强度建模”还没有经过当前版本的大样本验证

### 2. clone-based 搜索性能偏慢

当前 `TreeSearchAI` 仍主要依赖 `GameData.clone()` 推进搜索，但已补了状态缓存和定制 `clone()`。

- 现在最小样本 benchmark 可以较稳定完成
- 但候选较多的收官局面仍会明显变慢
- 本轮已补 exact TT，并把部分状态的最大 exact 分支从 `43` 压到 `26`
- 本轮又补了根结点无安全步直切 exact 路线集、小得分区 score route 兜底、live `scoreRegion` 实时扫描、长链 / 长环 `score-control` prefix，以及 `EDGE_NOT<=5` 的小安全边数 exact 窗口；当前带 seed 的单局 spot check 仍需几十秒到 `1m30s` 左右，而 `node aivsai.js -1 ts -2 ok -n 2 -s --seed 1` 整体仍耗时约 `9m48s`
- `seed=7` 的旧热点 `ply=43` 已明显缓和：该状态当前已压到 `16` 条 exact route，单点约 `4.3s`
- 当前更关键的慢局路径前移到了 `seed=7` 的 `ply=39 -> 0/0/42`：
  - `ply=39` 会沿 `8,9 -> 0/2/42 -> 10,5/12,9 -> 0/0/42` 进入新的 pure sacrifice 根
  - 本轮在固定 `0/0/42` 样例上已把 simple chain/ring 的重复 opening 折成代表 opening：
    - simple 闭区域统一只保留按路径顺序的第二条边
    - simple region 若命中 `ok` 赢线首手，则对应代表边会获得排序加成
    - 同一样例当前为 `14` 个闭区域代表 opening，进一步按后继 fingerprint 压成 `4` 条 exact root route
  - post-commit 已按“旧 replay + 当前代码 + 每个状态独立 new TreeSearchAI”重扫 `EDGE_NOT<=5`：
    - `ply=39` 仍是头号慢点，但约 `1.8s`
    - `ply=40~43` 当前约 `1.1s ~ 1.7s`
    - 说明旧 replay 的 late exact 爆点已经被明显压平，下一步需要转去抓当前代码实际走出的新整局热点，而不是继续深挖同一类 `0safe` 根
  - 但当前代码直接跑 `timeout 60s node aivsai.js -1 ts -2 ok -n 1 --seed 7 -o /tmp/pencil_seed7_current.json` 仍未在时限内自然结束，也没有生成完整新录像
  - 结合新的 `--late-trace` 结果看，当前版本的 `seed=7` 热点已经早于旧 late window：
    - `safe<=12` 在 `20s` 内仍未进入
    - `safe<=20` 在 `20s` 内只推进到 `ply=34/35`
  - 本轮已先在固定收官样例上验证两层压缩：
  - `getExactSacrificeBucketKey()` 现忽略几何方向 `h / v`
  - `exact_root_sacrifice_choice` 的 exact 根节点从 `20` 降到 `16`
  - `ring4_sacrifice_choice` 的 exact 根节点从 `10` 降到 `8`
  - simple 闭区域的 exact sacrifice root 现会先做 representative canonical，并统一只保留按路径顺序的第二条边
  - `node ts_cases.js` 当前约 `25.3s`
  - `node aivsai.js -1 ts -2 ok -n 1 --seed 1` 当前约 `17.7s`
- 本轮又继续回到该慢局路径本身复核：
  - `seed=7 / ply=43` 的旧 pure sacrifice 热点现已从约 `36s` 进一步降到约 `4.3s`
  - `generateExactSacrificeRoutes()` 现在只会对 `regionSize>2` 的大 sacrifice 去掉局部 `orderBonus`
  - 小链中间口回归 `small_chain_sacrifice_middle_preference` / `score_then_small_chain_middle_route` 仍保持通过
  - `safe=0` 的 `generateExactSacrificeRoutes()` 现在还会先跑一遍确定性的 `OffensiveKeeperAI` rollout；只有当 rollout 对当前行动方是赢线时，才把 rollout 首手对应的 route 提到前面
  - 已补 `ok_endgame_rollout_ordering` 固定回归，当前会固定把旧 `seed=7 / ply=43` 的首手排成 `8,5`，也就是 `ok` 赢线所在闭区域的代表边
  - `seed=7` 的 `0/0/42` pure sacrifice 根当前有 `14` 个闭区域代表 opening，并会进一步压成 `4` 条 exact root route；`safe=0` 根仍会优先尝试 `ok` rollout 的赢线所在闭区域
  - 已验证 `12,1 / 11,2`、`3,12 / 3,10` 这类根 sacrifice 会在唯一 exact score-prefix 后汇合，但直接把这层 canonical 接进主线会让整体求解变慢，当前先不合并
  - post-commit 复跑 `time node aivsai.js -1 ts -2 ok -n 1 --seed 7 -o /tmp/pencil_seed7_after8733ee9.json` 在约 `2m24s` 仍未自然结束，已手动停止；说明整局层面还有后续慢点
  - 已按“旧 replay + 当前代码”重扫 `EDGE_NOT<=5` 的所有 ply：
    - `ply=39` 约 `30.4s`，仍是当前第一热点
    - `ply=40~43` 已降到约 `4.2s ~ 4.4s`
    - 说明 `ok rollout` 排序提示进一步压下了旧 `ply=43` 热点，但 `ply=39` 还没有被真正解决
  - 整局 `seed=7` 仍未重新完整复测，说明热点定位还要继续
  - 下一轮的 profiling 入口应改成“当前版本新录像”而不是旧 replay：
    - 先直接用现有 `--late-trace` 把窗口继续往前开，必要时上提到 `safe<=24` 甚至更高
    - 拿到新的实际对局路径后，再按同一路径做独立状态重扫
    - 当前优先确认新的慢点是否已经上移到更早的 `safe` / `score+safe` 过渡段
- 旧的 `seed=8` 固定输局已在本轮翻成赢局，但这并不代表 exact 内部候选已经完整；整局里仍会遇到 `40` 路左右的 exact 状态，说明精确分支仍需继续压缩，并重新扫描新的稳定输局样本
- 更大样本 benchmark 依然不适合直接放大
- 后续如果要继续提胜率，必须同时优化：
  - 候选压缩
  - 搜索深度控制
  - 评估函数
  - 可能更轻量的状态 key / undo 机制

### 3. README 和当前实现仍有偏差

- README 里“网络对战目前状态是能够运行”是历史描述，不代表当前工作区已经可直接运行。

## 后续修改建议

- 优先保持现有“浏览器直接加载 + Node 直接运行”的结构，不要无故引入打包链。
- 代码大量依赖全局变量和原型链；改动时先确认浏览器和 Node 两边是否都受影响。
- 只要代码行为、运行方式、能力边界或已知问题发生变化，就同步更新相关文档；当前先保持 `AGENTS.md` 和专项计划文档与实现一致，`README.md` 暂不修改，后续再统一回补。
- 如果要补验证，建议顺序如下：
  1. `npm install`
  2. 验证 `node server.js`
  3. 验证浏览器网络对战
  4. 继续优化 `TreeSearchAI` 的候选生成、评估函数和性能

## 推荐的最小回归检查

- `node aivsai.js -n 5`
- `node aivsai.js -1 ok -2 gr -n 1 -s --seed 123`
- `node aivsai.js -1 ts -2 ok -n 1 --seed 1`
- `node ts_cases.js`
- `node -e "require('./game.js'); require('./gamedata.js'); require('./player.js'); require('./treeSearch.js'); console.log('core ok')"`

如果这些都通过，再继续做更完整的联机回归检查。

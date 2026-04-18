# TreeSearchAI 实现计划

## 目标

- 目标 AI: `TreeSearchAI`
- 对手 AI: `OffensiveKeeperAI`，即 `aivsai.js` 里的 `ok`
- 目标棋盘: 默认先以 `6x6` 为主
- 达标口径: 在先后手都交换的条件下，`TreeSearchAI` 对 `ok` 的总胜率达到或超过 `80%`
- 推荐统计口径: `node aivsai.js -1 ts -2 ok -n 200 -s`
- 达标标准: 总计 `400` 局里，`ts` 至少赢 `320` 局

## 当前现状

- `TreeSearchAI` 已经从“不可用原型”变成了“可运行但不够强”的状态
- 已完成的基础修复：
  - `TreeSearchAI` 已改为 clone-based 搜索骨架
  - `GameData` 增加了合法边枚举、区域统计和 board key 能力
  - `aivsai.js` 的 fallback 已可工作，并补了平均步数输出与 `--seed` 可复现对局支持
  - `OffensiveKeeperAI` 对少数 `scoreRegion / connectedRegion` 失配局面增加了鲁棒性保护
- 当前短样本基准：
  - 旧版代表步搜索曾跑出过：
    - `node aivsai.js -1 ts -2 ok -n 5 -s` 为 `5:5`
    - `node aivsai.js -1 ts -2 gr -n 5 -s` 为 `8:2`
  - 上一轮在“回合级路线 + 搜索核心优化 + Phase 4 结构评估初版”上跑过的 2+2 自定义短样本基线为：
    - `ts vs ok` 为 `1:3`
    - `ts vs gr` 为 `2:2`
  - 上一提交又补了“`--seed` 可复现对局 + 无安全步精确收官直切 exact + 根结点无安全步直接走 exact 路线集 + `exact_root_sacrifice_choice` 固定回归 + 小得分区 score route 校验/动态兜底 + `boundary_chain_ring_score_prefix` 回归 + live `scoreRegion` 查询改走实时扫描 + `live_ring8_score_prefix` 回归 + 长链 / 长环 `score-control` prefix 补齐”，并已重跑同口径 2+2 样本：
    - `node aivsai.js -1 ts -2 ok -n 2 -s --seed 1` 为 `4:0`
    - `node aivsai.js -1 ts -2 gr -n 2 -s --seed 123` 为 `4:0`
  - 本轮再补了“小安全边数 late endgame 接 exact，`EXACT_SAFE_EDGE_LIMIT=5`”和 `late_safe_window_choice` 固定回归，当前已重跑：
    - `node aivsai.js -1 ts -2 ok -n 1 --seed 1` 为 `1:0`
    - `node aivsai.js -1 ts -2 ok -n 1 --seed 4` 为 `1:0`
    - `node aivsai.js -1 ts -2 ok -n 1 --seed 8` 为 `1:0`
    - `node aivsai.js -1 ts -2 ok -n 1 --seed 123` 为 `1:0`
    - `node aivsai.js -1 ts -2 ok -n 2 -s --seed 1` 为 `4:0`
- 但本轮当前版本尚未重跑 `ts vs gr` 的同口径 2+2 样本
- 当前主要问题：
  - 对 `ok` 还远未达到 `80%`
  - 回合级路线骨架和搜索核心都已经落地，Phase 4 的显式特征和无安全步精确收官也已接入，但当前排序和评估还不足以支撑强度
  - 上一提交的固定 seed spot check 和 2+2 自定义短样本都已翻正；本轮又把 `seed=8` 固定输局翻成赢局，并把当前版本 `ts vs ok` 的 2+2 重跑到 `4:0`，但样本仍然太小，还不能据此认定对 `ok` / `gr` 已稳定占优
  - clone-based 搜索性能已较最早版本明显改善，但更大样本仍偏慢
  - 本轮已定位出 exact 爆炸主要来自 `score-all/stop + sacrifice` 组合，并补了 exact TT 与 exact score prefix 去重
  - 观测到的单点最大 exact 分支一度可从 `43` 压到 `26`，但最新 spot check 里仍会出现 `40` 路左右的精确状态
  - 当前带 seed 的单局 spot check 仍需几十秒到 `1m30s` 左右，而 `node aivsai.js -1 ts -2 ok -n 2 -s --seed 1` 当前版本整体仍耗时约 `9m48s`，说明小安全边数 exact 虽已能修输局，但分支压缩仍不够
  - `seed=7` 的旧热点 `ply=43` 已不再是唯一主瓶颈：该状态现已从 `16` 条 exact route、约 `9.3s` 继续压到约 `6.7s`
  - 当前更值得继续盯的是更早的 `ply=39` 路径：`0/5/40 -> 8,9 -> 0/2/42 -> 10,5/12,9 -> 0/0/42`
  - 这条路径里的 `0/0/42` pure sacrifice 根当前仍有 `10` 条 exact route，但其非负线 `12,1 / 11,2` 先前会被 exact sacrifice 的局部 `orderBonus` 压后
  - 候选生成和评估函数仍然不够贴近 README 里的末盘理论
- 当前 `ok` 的强度不低。实测 `node aivsai.js -1 ok -2 gr -n 20 -s` 的结果是 `88%` 胜率
- README 已明确写出 `ok` 的一部分判断是“不够完善的分析”，理论上可以被稳定针对

## 执行进度

- `Phase 0`: 部分完成
- `Phase 1`: 部分完成
- `Phase 2`: 部分完成
- `Phase 3`: 部分完成
- `Phase 4`: 部分完成
- `Phase 5`: 未开始

## 下次开始位置

- 从 `Phase 4` 中段继续，不要回头重做“让 `ts` 能跑起来”或“把搜索核心搭起来”的工作
  - 优先项：
    - 先固定使用 `--seed` 做输局复现，当前保留：
      - `seed=1 / 4 / 8 / 123` 作为当前版本已重跑的可赢样本
      - `node aivsai.js -1 ts -2 ok -n 2 -s --seed 1` 作为当前版本的整轮性能样本
      - `seed=7` 的 `ply=39 -> 0/0/42` 作为当前版本更核心的 exact 慢局样本
      - `8733ee9` 之后整局 `seed=7` 在约 `2m24s` 仍未自然结束，下一轮不要再盲等整局，要直接带 profiling 重扫新热点
    - 继续围绕 `ts_cases.js` 扩固定局面集，优先补：
      - 边界链与内部链混合（边界链 + ring 已补一例）
      - “一个区域有多种分割方式”的方向性断言
      - “最后一个能改变先后手的结构被哪一方保留 / 拿走”的方向性断言
      - 本轮已把录像里的 `6,9 -> 11,8 -> 6,11` 拆成第一版固定断言：
        - `6,9` 后根选点已改成 `6,11`，不再稳定选 `11,8`
        - `11,8` 后与 `11,8 -> 6,11` 后的结构机会签名已能区分
        - 末尾补充说明里的特殊局部也已补进状态摘要：`[0,11][1,12]` 这类需要两手兑现、但会被 `[2,11]` 一手 sacrifice 封死的机会，现单独记为 `deferred + blockable`
        - 本轮又补了第一版 `owner / handoff` 摘要：当前方拥有几个机会、对手拥有几个机会、是否只剩最后一个机会且归谁
      - 本轮已把这组断言继续收紧到“最后一个机会对应的目标 outcome 归谁受益”：
        - `GameData` 显式新增 `lastOpportunityBeneficiarySign`
        - `late_structure_opportunity_handoff_after_12_11` 现固定为 `lastOpportunityOwnerSign=-1` 且 `lastOpportunityBeneficiarySign=-1`
      - 本轮已先把廉价的 `owner / handoff` 信号接进 `TreeSearchAI.evaluateStructure()`，让 `safe<=12` 的 late eval 能直接看见 `currentOwnedOpportunityZoneNum / opponentOwnedOpportunityZoneNum / lastOpportunityOwnerSign`
      - 本轮又把 beneficiary 这层信号窄接到了 `safe 4 -> 2` 的 safe route ordering / late exact 入口，并给机会局部 exact 增加了按 `playerId` 共享的 cache
      - 本轮又把 `exact sacrifice bucket` 的几何方向 `h / v` 从 key 里去掉，先做保守压缩：
        - `exact_root_sacrifice_choice` 的 exact 根节点现已从 `20` 降到 `16`
        - `ring4_sacrifice_choice` 的 exact 根节点现已从 `10` 降到 `8`
        - `seed=7 / ply=43` 的热点状态现已从 `20` 条 exact route 降到 `16` 条
        - 同一热点状态上，`solveLateEndgame()` 已从约 `36s` 降到约 `9.3s`
      - 本轮又补了一层更窄的 exact sacrifice 排序修正：
        - `generateExactSacrificeRoutes()` 现在只会对 `regionSize>2` 的大 sacrifice 去掉局部 `orderBonus`
        - 小链中间口回归 `small_chain_sacrifice_middle_preference` / `score_then_small_chain_middle_route` 仍保持通过
        - `seed=7` 的 `0/0/42` pure sacrifice 根现会把 `12,1 / 11,2` 提前到前排
        - 同一根状态上的 `solveLateEndgame()` 约从 `26.0s` 降到 `23.7s`
      - 本轮还验证过一条更激进的 `forced exact score-prefix canonical` 思路：
        - `12,1` 与 `11,2`、`3,12` 与 `3,10` 这类 sacrifice 根，确实会在唯一 exact score-prefix 之后汇合到同一局面
        - 但把这层 canonical 直接接进主线会让整体求解变慢，当前先不合并，后续若再做要先解决计算代价
      - 下一步不是重复补状态，而是继续验证这层 beneficiary ordering 是否值得扩大范围，并继续沿 `seed=7 / ply=39 -> 0/0/42` 这类慢局压 exact 根；它仍不适合直接塞进 `evaluateStructure()` 的 hot path
        - 下一轮优先直接生成新的 `seed=7` 录像并按 `EDGE_NOT<=5` 重扫各 ply 的 exact 耗时，不再只看旧 replay 或盲等整局结束
        - 另外，当前 `estimateOpportunityOutcomeValue()` 对经典 handoff 的 `allow / block` 两个 outcome 仍都会给出正分，不能直接拿“纯静态替 exact”来接这层信号
    - 优先补状态抽象缺口，而不是先调一般权重：
      - 本轮已给 `GameData` 增加第一版“结构机会区签名 / critical split zone”信息
      - 已把这类签名并进 `controlFingerprint / route fingerprint`
      - “最后一个结构机会归属谁 / 被谁拿走 / outcome 对谁有利”现都已有显式摘要；其中 owner/handoff 已低成本接进 late eval，下一步改成把 beneficiary 变成可负担的搜索信号，而不是再加新的 zone 计数
    - 在上面这层状态表达落地后，再继续修 exact 内部候选缺口，优先查：
      - 多得分区切换时的 exact prefix 是否漏分支
      - 长链 / 长环 `control` 已补后，是否仍存在更复杂区域的 `leave-control` 断口
      - 多个可得分区之间来回切换时，exact TT / prefix 去重是否仍会误并状态
    - 状态签名和固定断言稳定后，再重新扫描新的稳定输局样本，不再沿用旧的 `seed=8` 输局结论
  - 继续压缩“无安全步精确收官”的分支数量，优先针对 `score-all/stop + sacrifice` 组合继续降分支
  - 保留 `exact_score_prefix_control_only` 这类前缀回归，继续找“单得分区 + 无 control”的 exact 爆炸状态并补针对性压缩
  - 先分析 `ts` 当前输给 `ok` 的局面类型，确认是状态抽象不够、候选遗漏还是预算不够
  - 在固定样例方向稳定前，只做小幅候选压缩修补，不再大幅扩张路线分支
  - 若 Phase 4 的评估方向稳定，再衔接 `Phase 5` 的输局归类和定向调优
- 保留现状：
  - 当前 clone-based 搜索骨架先不要推翻
  - 当前 `aivsai.js` / `GameData` 基础设施已经可用
  - 当前已经切到回合级路线搜索，并补了第一版搜索核心优化
  - `GameData.getEvalFeatures()`、`TreeSearchAI.evaluateStructure()`、无安全步精确收官求解和 `ts_cases.js` 已可作为后续调优基线

## 总体策略

持续运行直到完成计划, 文档和代码同步, 自行判断git commit的时机, commit后全面review计划(可以调整), 然后继续计划直到完成

- 先把 `TreeSearchAI` 做成“稳定、合法、可重复评测”的 AI
- 优先把 `README.md` 里的点格棋分析落地成代码中的显式概念，而不是只堆通用搜索
- 再把搜索单位从“单条边”提升为“完整回合决策”
- 再把点格棋收官中的链、环、让分抢先手逻辑做成精确或近精确处理
- 最后围绕 `ok` 的已知弱点做定向候选排序和评估函数调优

## README 优先落地的核心分析

### 必须直接编码的概念

- `环`
  - 一个连通区域内两点之间存在两条无重叠通路
- `闭区域`
  - 当前区域无法立刻得分，但区域内再下一笔就会让对手立刻得分
- `小区域`
  - 面积为 `1` 或 `2` 的闭区域
- `大区域`
  - 面积大于等于 `3` 的闭区域
- `有环区域 / 无环区域`
  - 大区域按是否包含环划分
- `无关步`
  - 无法改变分割、不让分且不得分的步
- `布局 / 收官`
  - README 认为对局明显分成这两个阶段，且两阶段目标不同
- `能改变先后手的结构`
  - 一个区域有多种分割，并且不同分割会导致无环区域数量不同

### 对实现的直接含义

- `TreeSearchAI` 不应该把 `README` 里的概念隐含在启发式里
- 应该先把这些概念做成稳定的数据接口，再基于这些接口生成候选和做评估
- 搜索的目标不是“眼前最大化得分”，而是：
  - 收官阶段抢到第一个大区域
  - 布局阶段把局面带到有利的先后手奇偶性
  - 尽量保留或抢到“能改变先手结构”的最后一个机会

### 建议先补的数据分析接口

- 在 `gamedata.js` 或单独分析模块中增加：
  - `getClosedRegions()`
  - `getSmallRegions()`
  - `getLargeRegions()`
  - `getRingRegions()`
  - `getIrrelevantEdges()`
  - `getControlSwingStructures()`
  - `isEndgamePhase()`
  - `countSafeEdges()`
  - `countNonRingLargeRegions()`

### 计划上的原则

- 若某一步实现无法映射回 `README` 的概念，就优先怀疑设计不对
- 若搜索和 `README` 分析冲突，优先检查候选生成与评估建模，而不是先盲目加深搜索
- 任何代码改动只要影响行为、运行方式、评测口径、已知问题或阶段结论，就同步更新相关文档；当前先保持 `AGENTS.md` 与 `plan.md` 和代码一致，`README.md` 暂不修改，后续再统一回补

## Phase 0: 先把评测基线修好 `状态: 部分完成`

### 已完成

- `aivsai.js` 的 fallback 已修通
- `aivsai.js` 已输出平均步数
- `gamedata.js` 已增加：
  - `getAllEdgesByType()`
  - `getAllLegalEdges()`
  - `getAllEdges()`
  - `getBoardKey()`

### 剩余

- 更细的统计输出还没做：
  - 先手胜率
  - 后手胜率
  - 搜索节点数
  - 平均决策时长

### 任务

- 修复 `aivsai.js` 的异常 fallback
- 给 `aivsai.js` 增加更可靠的统计输出
- 基于 `--seed` 建立固定 benchmark 口径，保证对战结果可复现
- 给 `TreeSearchAI` 预留参数入口，例如：
  - `searchDepth`
  - `nodeBudget`
  - `timeBudgetMs`
  - `evalMode`

### 具体改动

- 在 `gamedata.js` 增加通用合法边枚举接口，例如 `getAllEdgesByType(number)` 或 `getAllLegalEdges()`
- 在 `aivsai.js` 里改用这个接口，而不是调用不存在的 `getAllEdges`
- 在 `aivsai.js` 输出：
  - 总胜率
  - 先手胜率
  - 后手胜率
  - 平均步数
  - 固定 seed 信息
  - 若有可能，输出 `TreeSearchAI` 的平均搜索节点数和平均决策时长

### 验收

- `node aivsai.js -1 ok -2 gr -n 20 -s` 可稳定完成
- `node aivsai.js -1 ts -2 ok -n 5` 即使 `ts` 还很弱，也不能因为评测脚本自身异常而中断
- 若本阶段改动影响运行方式、评测方式或结论，提交前同步更新 `AGENTS.md`、`plan.md`；`README.md` 暂缓，后续统一回补

## Phase 1: 让 TreeSearchAI 成为一个“能下完整对局”的 AI `状态: 部分完成`

### 已完成

- `TreeSearchAI` 已改为可运行的 clone-based 搜索骨架
- 继承/递归/基本候选生成问题已修到“能完整跑对局”
- `OffensiveKeeperAI` 已增加少量鲁棒性保护，避免部分搜索局面直接异常
- `gamedata.js` 已补部分基础分析接口：
  - `getRegions()`
  - `getClosedRegions()`
  - `getSmallRegions()`
  - `getLargeRegions()`
  - `getRingRegions()`
  - `countSafeEdges()`
  - `isEndgamePhase()`
  - `getRegionStats()`

### 剩余

- 还没有把 README 中的所有核心概念都落成稳定接口
- 候选生成目前仍偏“代表步 + 静态评估”，还不是路线级搜索
- 最近 2+2 自定义短样本已能击败 `gr`，但样本仍小，还不能把本阶段视为完全完成

### 任务

- 先修结构错误，不谈强度
- 保证 `ts` 能合法完成整局对局，不崩溃，不返回非法坐标
- 把 `README` 的基础概念先做成可调用的状态分析接口

### 具体改动

- 调整继承关系，二选一：
  - 让 `TreeSearchAI` 继承 `GreedyRandomAI`
  - 或者把 `getRandWhere` 等通用能力上提到 `AIPlayer`
- 修正递归调用为 `this.negamax(...)`
- 重写 `put()` / `recover()` 语义，二选一：
  - 简单方案：每个候选都 `clone()` 后再 `putxy()`，先保证正确
  - 后续若性能不够，再做 undo 机制
- 修正 `where()` 的 `this.way` 缓存：
  - 只有当当前局面 hash 不变时，才允许继续消费缓存路线
  - 局面一变就清空
- 在 `gamedata.js` 中补最基础的结构分析：
  - 识别闭区域
  - 识别小区域 / 大区域
  - 识别有环区域 / 无环区域
  - 识别无关步
  - 识别布局阶段 / 收官阶段
- 让 `gen()` 至少能按以下三类生成合法候选：
  - `EDGE_NOW`
  - `EDGE_NOT`
  - `EDGE_WILL`

### 阶段目标

- `ts` 可以完整跑完对局
- `ts` 可以稳定击败 `gr`

### 验收

- `node aivsai.js -1 ts -2 gr -n 20 -s` 无异常
- 胜率目标先设为 `>= 60%`
- 若本阶段引入新的结构分析接口、约束或限制，文档同步补齐

## Phase 2: 把搜索单位从“单步”改成“完整回合” `状态: 部分完成`

### 为什么这是关键

- 点格棋里只按单条边搜索，信息是不完整的
- 一旦吃到分，当前玩家会继续走，所以真正应该搜索的是“一个回合内的决策序列”
- `ok` 的强弱也主要体现在收官时是否正确处理“吃多少、什么时候让、是否抢先手”

### 任务

- 把候选生成从“单个坐标”升级成“路线”
- 区分三类路线：
  - 立刻吃分并持续吃到某个停点
  - 安全步
  - 主动让分换先手的步
- 候选生成要直接围绕 `README` 里的结构分类来做，而不是只按边类型枚举

### 已完成

- `TreeSearchAI` 已改为回合级路线缓存：
  - `where()` 会缓存当前搜索出的整条路线
  - 局面 key 不匹配时会丢弃旧路线，避免继续消费过期路线
- 搜索单位已经从“单边”切到“完整回合路线”：
  - `searchRoot()` / `searchState()` / `searchQuiescence()` 都改为按路线推进
  - 路线结点之间按完整回合递减深度
- 已落地的路线类型：
  - `全吃`
  - `吃到最后一口前停手`
  - `双格链让分抢先手`
  - `四环让分抢先手`
  - `EDGE_NOT` / `EDGE_WILL` 的代表性单步路线
- 已补基础去重与排序：
  - 用路线落点后的结构指纹去重
  - 对安全步保留“结构变化”优先级和无关步奇偶性倾向
- `gamedata.js` 已补安全步结构分析接口：
  - `getStructureFingerprint()`
  - `getControlFingerprint()`
  - `getSafeEdgeAnalyses()`
  - `getIrrelevantEdges()`
  - `getControlSwingStructures()`
  - `getSacrificeEdgeAnalyses()`
- `TreeSearchAI` 的安全步候选已改为三层筛选：
  - `safe-control`
  - `safe-shape`
  - `safe-irrelevant`
- `safe-irrelevant` 已开始区分局部几何，不再把空盘上的所有无关步都压成同一个代表点
- 已新增“连续无关步快进”的搜索骨架：
  - 当局面只剩无关安全步时，搜索会尝试直接快进到下一次出现结构变化前
  - 目标是把搜索深度留给真正的分割、让分和收官决策
- `EDGE_WILL` 候选已开始按区域特征做分析，而不再只是裸枚举单边
- 得分路线前缀的缓存和目标区域推进逻辑已修正，不再在目标区域被吃完后直接把整条候选判成无效

### 剩余

- 当前路线候选仍然偏噪声；最近 `ts` 对 `gr` 和 `ok` 的短样本已翻正，但还没有经过更大样本证明稳定
- “能改变先后手的结构”已经有了初版显式候选，但建模仍偏粗糙
- 安全步和让分步目前仍主要靠统计特征排序，不够接近 README 的结构分析
- 新增的“无关步快进”与 `EDGE_WILL` 分类都还没有被证明真的提升最终胜率
- 当前回合级版本性能已比早期 clone-based 原型好很多，但仍不适合直接扩大 benchmark 样本

### 具体改动

- 重写 `gen(gameData, deep)`，返回 `Array<Array<{x, y}>>`
- 对 `EDGE_NOW` 的处理不要只返回一个点，而要枚举“有意义的不同收官路线”
- 至少覆盖这些路线类型：
  - 全吃
  - 吃到最后一口前停手
  - 双格链的让分抢先手
  - 四环的让分抢先手
- 对“能改变先后手的结构”单独建候选：
  - 同一区域的不同分割方案
  - 会改变无环区域数量的安全步
  - 会把布局阶段推向收官阶段的关键步
- 对 `EDGE_WILL`，不要只取最小区域的一个边，至少要枚举：
  - 最小链让分
  - 边界链与非边界链
  - 环与非环
- 对 `EDGE_NOT`，优先只保留“结构上有区别”的候选，而不是把所有安全边全展开
- 对 `EDGE_NOT` 中的无关步单独处理：
  - 若多个无关步在结构上完全等价，只保留代表步
  - 把“剩余无关步数的奇偶性”作为候选排序的重要因素

### 阶段目标

- 搜索树的分支能代表真实战术选择
- `TreeSearchAI` 不再只是把 `ok` 的策略重写一遍，而是开始比较不同完整回合的结果

### 验收

- `node aivsai.js -1 ts -2 ok -n 50 -s` 能完整跑完
- 总胜率目标先设为 `>= 55%`
- 若候选生成策略、路线定义或术语发生变化，更新相关文档说明

## Phase 3: 做真正能用的搜索核心 `状态: 部分完成`

### 任务

- 引入标准搜索优化，先解决“能搜多深”的问题

### 已完成

- 已补 alpha-beta 剪枝，搜索节点按完整回合路线推进
- `where()` 已改为迭代加深，而不是只跑单个固定深度
- 已补第一版 transposition table：
  - 按深度缓存
  - 支持 `exact / lower / upper` 三种条目
  - 可把上一轮最好路线用于下一轮排序
- 已补第一版 move ordering：
  - 候选自身排序分
  - TT 最佳后继优先
  - history-style cut 路线加分
- 已补收官延伸搜索：
  - `EDGE_NOW` 不会在普通静态评估处立刻截断
  - 出现大区域且剩余安全步很少时，会提前进入收官延伸
- `GameData` 已补性能基础设施：
  - 状态缓存
  - 定制 `clone()`
  - `boardKey / regionStats / edge analyses` 缓存

### 剩余

- 搜索核心虽然已落地，但搜索深度和静态评估还没有形成稳定正反馈
- 当前 node/time budget 只是参数入口，还没有找到合适默认值，也没接进 `aivsai.js`
- 多得分区和复杂让分局面里，候选数量依然会把搜索拖慢
- 最新 2+2 自定义短样本已翻成：
  - `ts vs ok` 为 `4:0`
  - `ts vs gr` 为 `4:0`
- 说明 Phase 3 的“可用搜索框架”已经有了，且最近修补开始直接影响胜负，但性能与大样本稳定性仍未达到本阶段验收线

### 具体改动

- alpha-beta 剪枝
- 迭代加深
- transposition table
- move ordering
- quiescence / 收官延伸搜索
- 结合 `README` 的阶段划分，做分阶段搜索策略：
  - 布局阶段更关注结构变化
  - 收官阶段更关注精确求解

### move ordering 建议顺序

- 必胜或必败已知路线
- 收官中“全吃”和“留口”的关键路线
- 能改变先后手结构的分割路线
- 改变区域分裂结构的安全步
- 无关步中能改变奇偶性的代表步
- 普通安全步
- 明显吃亏的让分步

### transposition table 建议

- 初版可直接用字符串 key，例如把 `map`、`playerId`、`score` 序列化
- 等逻辑稳定后，再换更轻量的 hash

### quiescence 建议

- 只要盘面上还存在 `EDGE_NOW`，不要在普通静态评估处截断
- 对链和环的收官，尽量搜索到“当前回合真正结束”为止
- 若已进入 `README` 所说的收官阶段，优先延伸到“大区域归属已经明确”为止

### 阶段目标

- 搜索不再被大量无效分支拖死
- `ts` 在收官的判断明显优于 `ok`

### 验收

- `node aivsai.js -1 ts -2 ok -n 100 -s` 可以在可接受时间内完成
- 总胜率目标先设为 `>= 65%`
- 若搜索参数、搜索模式或性能边界改变，更新相关文档说明

## Phase 4: 用点格棋领域知识重写评估函数 `状态: 部分完成`

### 为什么不能继续依赖 rollout

- 旧版 `evaluate()` 是对 `OffensiveKeeperAI` 做 rollout
- 这会同时带来三个问题：
  - 太慢
  - 噪声大
  - 评估目标与“打赢 ok”并不完全一致
- 当前版本已经改为“结构评估 + 无安全步精确收官”，但权重和方向判断还远未稳定

### 任务

- 把评估从“随机模拟”改成“结构评估 + 精确收官判断”
- 评估项要尽可能与 `README` 中的分析一一对应

### 已完成

- `gamedata.js` 已新增 `getScoreRegions()` 和 `getEvalFeatures()`：
  - 归纳 `EDGE_NOW / EDGE_NOT / EDGE_WILL`
  - 区分 `layout / transition / endgame`
  - 提取大小区域、环、链、可得分区和奇偶性相关特征
- `treeSearch.js` 已把 `evaluate()` 拆成：
  - `evaluateStructure()`
  - `solveExactEndgame()`
- 已新增“无安全步收官”的精确求解缓存：
  - 没有 `EDGE_NOT` 时，不再退回 rollout 或纯静态猜测
  - 当前版本已改为“结构指纹去重后再做精确收官搜索”，并修正了一个 ring4 让分选错的关键分支
  - exact score route 已开始在 `control` 存在时跳过同区域的 `stopBeforeLast`
  - `score-control` 已从只覆盖 `chain2 / ring4` 扩到可沿长链 / 长环连续吃到最后控制位
  - 小安全边数的 late endgame 已正式接进 `searchState / searchQuiescence`，当前精确窗口为 `EDGE_NOT<=5`
  - exact 搜索缓存已升级为带 `exact / lower / upper` 的 TT，而不再只有精确值缓存
- 已新增固定局面回归脚本 `ts_cases.js`，当前已覆盖：
  - `control_swing_layout`
  - `multi_score_regions`
  - `single_large_chain_open`
  - `pure_small_endgame`
  - `ring4_sacrifice_choice`
  - `exact_root_sacrifice_choice`
  - `late_safe_window_choice`
  - `small_chain_sacrifice_middle_preference`
  - `score_then_small_chain_middle_route`
  - `exact_score_prefix_control_only`
  - `boundary_chain_ring_score_prefix`
  - `live_ring8_score_prefix`
- 已验证：
  - `node ts_cases.js`
  - `node -e "require('./game.js'); require('./gamedata.js'); require('./player.js'); require('./treeSearch.js'); console.log('core ok')"`
  - `ring4_sacrifice_choice` 当前会固定选出 `2,1`
  - `exact_root_sacrifice_choice` 当前会固定选出 `8,1`
  - `late_safe_window_choice` 当前会固定选出 `11,12`（同指纹等价代表边）
  - `late_structure_opportunity_handoff_after_12_11` 当前会固定识别为 `lastOpportunityOwnerSign=-1 / lastOpportunityBeneficiarySign=-1`
  - `small_chain_sacrifice_middle_preference` 当前会固定选出 `11,6`
  - `score_then_small_chain_middle_route` 当前会固定生成 `3,12 -> 11,6`
  - `node aivsai.js -1 ts -2 ok -n 1 --seed 1` 为 `1:0`，平均步数 `78`
  - `node aivsai.js -1 ts -2 ok -n 1 --seed 4` 为 `1:0`，平均步数 `80`
  - `node aivsai.js -1 ts -2 ok -n 1 --seed 8` 为 `1:0`，平均步数 `72`
  - `node aivsai.js -1 ts -2 ok -n 1 --seed 123` 为 `1:0`，平均步数 `71`
  - 本轮当前版本已验证：
    - `node aivsai.js -1 ts -2 ok -n 2 -s --seed 1` 为 `4:0`
  - 上一提交已验证：
    - `node aivsai.js -1 ts -2 ok -n 2 -s --seed 1` 为 `4:0`
    - `node aivsai.js -1 ts -2 gr -n 2 -s --seed 123` 为 `4:0`
  - `node aivsai.js -1 ok -2 gr -n 1 -s --seed 123` 可稳定复现 `OK 2胜 GR 0负 (100%)`

### 剩余

- 上一提交的最近 2+2 自定义短样本已经翻成：
  - `ts vs ok` 为 `4:0`
  - `ts vs gr` 为 `4:0`
- 本轮又把 `seed=8` 固定输局翻成赢局，并把当前版本 `ts vs ok` 的 2+2 重跑为 `4:0`，但当前版本对 `gr` 尚未重跑同口径 2+2，因此还没有形成可宣称稳定的胜率优势
- 本轮已落地第一版“结构机会区”状态表达：
  - `GameData` 新增 `structureOpportunitySummary / signature`
  - `getEvalFeatures()` 新增 `splitOpportunityZoneNum / criticalSplitZoneNum / lastCriticalSplitZone`
  - `controlFingerprint / route fingerprint` 已并入这层签名
  - `transition` 阶段的 `controlSwing` 已改成带当前回合方向的信号，不再无符号加分
- 本轮又把 `test_record.md` 末尾补充的特殊情况落成了第二层状态：
  - 新增 `deferredCriticalSplitZoneNum / blockableDeferredCriticalSplitZoneNum`
  - 用于表示“理论上能改无环区域数，但需要同一方连续两手兑现，并且可能被对手一手 sacrifice 封死”的局部
  - 当前这层原始计数主要并进 `structureOpportunitySignature`；其 owner/handoff 摘要已开始间接进入评估分数
- 本轮又把 `owner / handoff` 落成了第三层状态：
  - 新增 `currentOwnedOpportunityZoneNum / opponentOwnedOpportunityZoneNum / lastOpportunityOwnerSign`
  - 并补了 `late_structure_opportunity_handoff_after_12_11`，固定“只剩最后一个机会且 action owner 已交给对手”的节点
  - 本轮已把这层低成本接进 `TreeSearchAI.evaluateStructure()`，在 `safe<=12` 时参与 late eval，且 `safe<=6` 时权重更高
  - 这一层现在已经不是终点；本轮又继续补出了 beneficiary 层
- 本轮又把 `outcome-beneficiary` 落成了第四层状态：
  - 新增 `lastOpportunityBeneficiarySign`
  - 当前通过 `getStructureOpportunitySummary(null, true)` 显式计算，只在 `safeEdgeCount<=2` 且只剩一个机会区时启用
  - `late_structure_opportunity_handoff_after_12_11` 现固定为 `owner=-1 / beneficiary=-1`
  - 本轮已把这层信息窄接到 `safe 4 -> 2` 的 safe route ordering；关键局部里 `[12,11]` 现会排到 `[0,11]` 之前
  - 这层信息目前仍刻意没有并回常规 `getEvalFeatures()` / `controlFingerprint`；它若要继续扩大，也应优先沿 late exact 入口扩，而不是直接进 `evaluateStructure()` hot path
- 本轮已把 `6,9 -> 11,8 -> 6,11` 的主样例固定进 `ts_cases.js`：
  - `6,9` 后根选点现固定为 `6,11`
  - `11,8` 后会识别出更多结构机会
  - `11,8 -> 6,11` 后现在还会识别出一个 `deferred + blockable` 的局部机会
  - `11,8 -> 6,11 -> 10,11 -> 12,11` 后现在已能显式表达“最后一个决定性结构机会的动作控制权和 outcome 受益方都归对手”
- `late_safe_window_choice` 的代表边已从旧的 `12,3` 切到同指纹的 `11,12`，回归已放宽为等价代表边断言
- 新 spot check：
  - `time node ts_cases.js` 当前约 `19.3s`
  - `time node aivsai.js -1 ts -2 ok -n 1 --seed 1` 当前为 `TS 1:0 OK`，平均步数 `67`，约 `26.7s`
- 固定局面样例还缺：
  - 边界链与内部链混合
  - 更强的“最后一个决定性结构机会归属 / 交接”断言
- 已有 `--seed` 支持，但还没有基于固定 seed 集的更大样本 benchmark
- `controlSwing`、大区域归属和 transition 阶段的权重仍然偏经验值，需要结合输局继续校正
- 当前无安全步精确收官虽然已补 exact TT、根结点 exact 路线直切、小得分区 score route 校验、live `scoreRegion` 实时扫描、长链 / 长环 `score-control`、`EDGE_NOT<=5` 的小安全边数 exact，且部分状态可把最大 exact 分支从 `43` 压到 `26`，并把 `seed=8` 固定输局翻成赢局，但最新整局 spot check 仍会遇到 `40` 路左右的 exact 状态，且当前版本 `ts vs ok` 的 2+2 仍耗时约 `9m48s`，因此 exact 内部候选和分支压缩仍未完成
- 本轮又补了一层保守的 exact 分支压缩：
  - `getExactSacrificeBucketKey()` 现忽略几何方向 `h / v`
  - 已验证 `exact_root_sacrifice_choice` 的 exact 根节点从 `20` 降到 `16`
  - 已验证 `ring4_sacrifice_choice` 的 exact 根节点从 `10` 降到 `8`
- 当前已抓到一个更具体的性能瓶颈样本：
  - `seed=7` 的旧热点 `ply=43` 当前实际是 `0/0/41` 的 pure sacrifice endgame
  - 该状态旧记录为 `20` 条 exact route、`solveLateEndgame()` 约 `36s`
  - 当前版本已把它压到 `16` 条 exact route、单点约 `6.7s`
  - 但热点已经前移到 `ply=39 -> 0/0/42` 这条路径，本轮进一步确认真正拖慢的是大链 sacrifice 根的排序
  - 对应的 `0/0/42` pure sacrifice 根当前仍有 `10` 条 exact route，但 `12,1 / 11,2` 两条非负线已被提到前排，单点约从 `26.0s` 降到 `23.7s`
  - 已验证某些 root sacrifice 会在唯一 exact score-prefix 后汇合到同一后继，但直接 canonical 仍太贵，先记为下一步优化方向
  - 整局 `seed=7` 仍未重新完整复测，说明当前还不能把这次局部压缩等同于“整局已修完”
  - post-commit 复跑 `time node aivsai.js -1 ts -2 ok -n 1 --seed 7 -o /tmp/pencil_seed7_after8733ee9.json` 在约 `2m24s` 仍未自然结束，已手动停止；说明这次提交确实没把整局主热点清空
  - 已试过的简单 `generateExactSacrificeRoutes().slice(...)` 限流不可直接采用：
    - `top 8` 会把该状态从 `win` 剪成 `loss`
    - `top 12` 会把该状态从 `win` 剪成 `draw`
    - `top 16` 虽保正确性，但单点仍约 `38s`
- 已补一个来自 `test_record.md` 的稳定让分回归：在 `L2` / `L4` 同值时，当前会优先选 `L2` 的中间边，而不是把 `L4` 或边界边排到前面
- 已补一个来自 `test_record.md` 的组合路线回归：`score-all+sacrifice` 现在会保留 continuation 的让分排序，不再把 `3,12 -> 9,12` 这种次优第二手缓存进 `routePlan`
- 最新对局分析说明当前更核心的缺口不是一般意义上的 parity 权重，而是“最后一个能改变先后手的结构”没有被当作区域级状态保存：
  - 这一轮已补上第一版 `structure opportunity zone` 的显式表达，并接进了评估和 route fingerprint
  - 这一轮又补上了 `deferred + blockable` 的第二层表达，能区分“理论机会”和“会被一手 sacrifice 封死的机会”
  - 这一轮又补上了 `owner / handoff` 的第三层表达，已经能区分“动作控制权”是否交接，并且已低成本接进 late eval
  - 本轮又补上了 `outcome-beneficiary` 的第四层表达，已经能区分“这个最后机会的结果最终对谁有利”
  - 例如 `11,8 -> 6,11 -> 10,11 -> 12,11` 之后，当前实现现已固定识别为“最后一个动作机会归对手，且 outcome 也归对手受益”
  - 本轮又把 beneficiary 窄接进了 `safe 4 -> 2` 的 route ordering，说明这层状态已经开始进入主搜索
  - 本轮又把 exact sacrifice bucket 做了保守压缩，至少在固定收官样例里已经看到根节点数下降而不改最佳解
  - 当前真正剩下的不是“有没有这层状态”，而是“如何继续沿 `seed=7 / ply=39 -> 0/0/42` 这类慢局把 exact 根继续压下去”，以及“是否值得继续把 beneficiary 从 `safe 4 -> 2` 扩到更宽的 late exact 入口”

### 评估函数建议特征

- 当前分差
- 当前回合归属
- `EDGE_NOW / EDGE_NOT / EDGE_WILL` 数量
- `connectedRegion` 的数量与大小分布
- 小区域数量
- 大区域数量
- 环数量
- 长链数量
- 边界链与非边界链分布
- 第一个大区域是否已可被当前方抢到
- 可改变先后手结构的数量
- 最后一个可改变先后手结构的机会是否仍存在，以及归属谁
- 某个具体区域是否存在多种分割，并且这些分割会把无环区域数量带到不同奇偶性
- 无环大区域数量的奇偶性
- 能否通过当前布局改变进入收官时的先后手
- 剩余无关步数量
- 由当前候选引起的区域分裂数量变化

### 关键强化点

- 对收官做近精确求解
- 对 README 中明确提到的 `ok` 弱点建立针对性识别
- 把“抢到第一个大区域”与“保持可改变先手结构的偶数性”写进估值
- 把“若已无可改变结构，则剩余无关步数 + 小区域个数的奇偶性”写进估值
- 真正把“最后一个结构机会”的启发式放在布局阶段快结束时再启用：
  - 不要在布局早期就用它主导全局排序
  - 应在 `layout` 末段 / `transition` 初期，当安全边明显收缩、区域分割开始定型时再把它抬成主信号
  - 进入纯收官后则应更多交给 exact / late solver，而不是继续靠这类启发式硬推

### 建议新增的测试素材

- 从 README 提到的这些弱点出发，制作固定局面回归样例：
  - 存在面积 `1` 的区域
  - 存在多个面积 `2` 的区域
  - 只有一个面积 `2` 区域，但它和当前拿分区域不是同一个
  - 一个区域有多种分割方式
  - 环与无环区域混合
  - 边界链与内部链混合
  - 场上仍存在双方都无法得分的边
  - 只剩最后一个连通区域

### 阶段目标

- `ts` 的优势来自结构判断，而不是只靠更深搜索硬搜

### 验收

- `node aivsai.js -1 ts -2 ok -n 100 -s` 总胜率达到 `>= 72%`
- 若评估函数的核心概念、局面分类或回归样例集合发生变化，更新相关文档说明

## Phase 5: 围绕 ok 做定向调优，冲到 80% `状态: 未开始`

### 任务

- 分析 `ts` 输给 `ok` 的局面类型
- 对高频输法逐类补规则、补排序、补估值

### 调优方法

- 每轮跑：
  - `node aivsai.js -1 ts -2 ok -n 100 -s`
- 每轮保存输局 history
- 对输局按类型归类：
  - 收官链处理错误
  - 环处理错误
  - 安全步候选遗漏
  - 候选排序错误
  - 评估函数方向错误
  - 搜索深度不够

### 重点优化项

- 安全步候选压缩不能过度，否则会错过改变分割结构的关键步
- 对链、环的“全吃”与“留口”决策要优先精确化
- 在 `ok` 已知弱点盘面上，确保 `ts` 的选择是稳定的，不受随机性影响
- 对 `ok` 当前使用的这些判断逐项建立反制回归：
  - 场上存在双方都无法得分的边
  - 最后一个连通区域
  - 存在面积 `1` 的区域
  - 面积 `2` 的区域多于一个
  - 面积 `2` 的区域为 `1` 个但和当前可拿分区域不是同一个
  - 多个不同连通区域都能得分
  - 拿分区域含边界且长度不为 `2`
  - 拿分区域不含边界且长度不为 `4`
- 如果纯静态评估仍不足，再考虑：
  - 小规模定向 rollout
  - 只在布局阶段使用 rollout
  - 收官阶段完全禁用 rollout

### 最终验收

- 主要验收：
  - `node aivsai.js -1 ts -2 ok -n 200 -s`
  - 总胜率 `>= 80%`
- 建议附加验收：
  - 更换多个 seed，结果仍稳定在 `>= 75%`
  - 对 `gr` 的胜率保持在 `>= 95%`
- 收尾时统一回看 `AGENTS.md`、`plan.md`，确保最终实现、基准结果和已知限制没有文档漂移；`README.md` 后续再统一补齐

## 建议的实施顺序

1. 修 `aivsai.js` 和评测能力
2. 修 `TreeSearchAI` 的继承、递归、局面推进
3. 把候选从单步升级成路线
4. 引入 alpha-beta、迭代加深、transposition table
5. 用结构评估替换 rollout
6. 建立针对 `ok` 的固定局面回归集
7. 循环对战、分析输局、调参到 `80%`

## 建议改动文件

- `treeSearch.js`
- `gamedata.js`
- `aivsai.js`
- 如需固定局面回归，建议新增：
  - `fixtures/`
  - `bench/`
  - 或单独的 `ts_cases.json`

## 主要风险

- `GameData.clone()` 现在是深拷贝，搜索一深就可能很慢
- `GameData.putxy()` 逻辑复杂，直接做 undo 容易引入隐蔽 bug
- 点格棋在布局阶段安全步很多，若不做候选压缩，搜索会爆炸
- 若候选压缩过度，又可能漏掉真正决定胜负的分割步
- 虽然现在已有 seed 支持，但如果不维护固定 seed 集和固定局面回归，80% 胜率仍很难稳定复现

## 结论

- 这个目标可做，但前提不是“把现有 `treeSearch.js` 调一调”
- 正确路径是：
  - 先修成一个可靠的搜索框架
  - 再把点格棋的链、环、先后手理论写进候选生成和评估函数
  - 最后围绕 `ok` 的已知漏洞做定向回归和调优

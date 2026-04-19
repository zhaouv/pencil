time node aivsai.js -1 ts -2 ro -n 5 -s -
o replay.html
TreeSearchAI(先手) vs RolloutAI(后手) 6x6 5局
结果: TS 3胜 RO 2负
平均步数: 77

RolloutAI(先手) vs TreeSearchAI(后手) 6x6 5局
结果: TS 4胜 RO 1负
平均步数: 72

综合 10局: TS 7胜 RO 3负 (70%)

录像已保存: replay.html
直接在浏览器中打开即可观看

real    10m54.900s
user    11m44.017s
sys     0m11.635s


我review了录像, 之前能赢其实是牺牲L3,而对手不抢先手全吃了. 本质是对手ai太弱不会下.在高手面前提前牺牲L3+等于认输.这种
  行为还很占搜索资源.有什么建议(这轮只问答不动文件)


• 你的判断基本对。对“高手模型”来说，提前牺牲 L3+ / R4+ 如果不是被证明的唯一不输线，通常就是战略性自杀；之前能赢只是 ok
  没守住 control。这类线不该进入主搜索核心。

  我会按优先级这么看：

  - 第一优先不是“继续调 penalty”，而是把“纯 sacrifice 尾巴”尽量精确化。现在真正危险的不是纯 safe=0 根本身，而是“前面先吃
    一段，回合末落到 pure sacrifice”这种 suffix。普通 score 路线当前仍会接近似的 generateTurnEnderRoutes()，这里最容易
    把“靠对手漏招才成立的 L3 sacrifice”混进来。treeSearch.js:712
  - 在 pure sacrifice 子树里，用支配关系直接砍分支是对的，而且应该比现在更系统。你这次加的“有 L1/L2 就禁 L3+/R4+”我认为
    是对的。再往前一步，可以考虑“只展开最小 closed 区域 size 的 bucket”，也就是有 L1 只看 L1，没有 L1 但有 L2 只看 L2，
    大区只保留极少数 fallback 代表。这样既更像高手下法，也更省节点。
  - ok 定向排序最好和“强棋模式”分开。当前 treeSearch.js:1026 和 OK_ENDGAME_ROUTE_BONUS 明显是在把 exact sacrifice 的排序
    往“ok 会漏”的线拉。treeSearch.js:879 这不一定改 correctness，但会改资源分配和 PV 倾向。只要以后继续看时间预算，这类
    ok-only ordering 就会越来越危险。
  - 近似评估里，对大 sacrifice 应该用“对手保持 control”的悲观模型，而不是“也许对手会全吃”。现在 tag==='sacrifice' 的惩罚
    有，但还偏温和。treeSearch.js:1178 对高手目标，我会把 L3+ / R4+ 的 opening 视为默认巨大负面，除非 exact 已经证明它不
    输。
  - 你现在的 EXACT_SAFE_EDGE_LIMIT=5 主要解决 late window。treeSearch.js:14 但“假赢线”常常是在更早的 score->sacrifice 过
    渡段混进来的，所以与其单纯再把窗口往前推，不如优先把“进入 pure sacrifice suffix 时立刻 exact 化”做掉。这个收益通常比
    全局提窗口更高，副作用也更小。
  - 如果目标分成两种，其实可以明确分模式：
      - robust：假设对手最优，禁 exploit line。
      - exploit-ok：允许利用 ok 的漏招。
        默认应该是 robust，否则搜索会被弱对手偏差带坏。

  一句话总结：你这次看到的问题，不是“L3 penalty 不够大”，而是“搜索里还存在把对手漏招当成主线价值”的入口。最该做的是把
  pure sacrifice suffix 从 ok-aware 近似，改成 opponent-optimal 的精确或半精确处理。

  如果你愿意，下一轮我可以只做方案设计，不改文件，直接把“哪些调用点该改成 exact suffix、哪些地方该保留硬剪枝、哪些地方该
  关掉 okHint”列成一个很具体的改造清单。



设陷阱 [[1,0,0],[2,3,1],[0,1,0],[7,8,1],[0,3,0],[8,7,1],[4,3,0],[0,11,1],[3,0,0],[11,0,1],[10,1,0],[0,9,1],[5,0,0],[8,1,1],[8,3,0],[10,5,1],[12,3,0],[9,8,1],[0,5,0],[6,11,1],[4,5,0],[8,9,1],[0,7,0],[4,7,1],[12,7,0],[3,8,1],[12,9,0],[11,10,1],[3,12,0],[7,12,1],[8,5,0],[6,5,1],[9,12,0],[2,5,1],[7,0,0],[1,8,1],[4,1,0],[2,11,1],[6,3,0],[12,5,1],[5,8,0],[4,9,1],[10,3,0],[10,11,1]] 直接[11,6]牺牲右上L3
这个ts ai不会中, ro ai会中

注:如果抄作业就简单了, 尽量还是让两个llm公平竞争不外部学习了
一组「点格棋/Strings-and-Coins 相关算法进展」的直接论文入口：

1) Dots & Boxes is PSPACE-complete（复杂度结果）
https://arxiv.org/abs/2105.02837

2) Strings-and-Coins and Nimstring are PSPACE-complete（相关变体）
https://arxiv.org/abs/2101.06361

3) Best play in Dots and Boxes endgames（端局最优算法：loops+chains）
https://arxiv.org/abs/1811.10747

4) Dots and Boxes on Certain Families of Graphs（特定图族上的算法/性质）
https://arxiv.org/abs/2407.15198

5) Playing simple loony dots and boxes endgames optimally（历史经典，偏端局策略）
https://arxiv.org/abs/1305.2156

6) arXiv 搜索（最新/全量按时间）
https://arxiv.org/search/?query=dots+and+boxes&searchtype=all&order=-announced_date_first

如果你要，我可以再按“只要有代码可复现/有对战指标”的筛一下。
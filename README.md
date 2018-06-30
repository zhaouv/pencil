# pencil

pencil小游戏以及其AI

在线游戏: [link](https://zhaouv.top/pencil/)

## AI

### GreedyRandomAI

+ 当有能立刻得分的边时直接落子拿分
+ 无法立刻得分也无需让分时, 随机一个不让分的边走
+ 必须让分时, 挑面积最小的连通区域让给对手

### OffensiveKeeperAI

继承GreedyRandomAI, 但是不计算代价的在收盘阶段尝试保持先手, 在能立刻得分时引入额外的判断, 满足任意一个就选择拿分, 均不满足时选择让分数抢先手:

+ _场上存在落字双方也无法得分的边_
+ 最后一个连通区域 
+ _存在面积1的区域_
+ _面积2的区域多与一个_
+ _面积2的区域为1个但和目前能那分的区域不是同一个_
+ 多个不同的连通区域能得分(_并未选择先吃掉不含边界的区域_)
+ 拿分区域含边界且长度不为2
+ 拿分区域不含边界且长度不为4

_斜体部分_ 是不够完善的分析, 利用其中的漏洞可以100%胜率战胜这个AI.

## 网络对战

目前状态是可运行

# Notice

`socket.io/socket.io.js` from [socket.io-client](https://github.com/socketio/socket.io-client/blob/master/dist/socket.io.js) ([LICENSE](socket.io/LICENSE))

`server.js` modified from [motajs/socket_server](https://github.com/motajs/socket_server/blob/master/server.js)
# Python API

借助网络对战功能, 用Node的client, 连接server并向python脚本提供接口

目前问题: 自己胜的判定通过`putxy`的返回值可以得出, 对方获胜要通过`gethistory`, 发现`length`变短了, 意味着自己输了并已经重开了一局. 这样就无法获取失败时的局面了.

## Install

```
git clone https://github.com/zhaouv/pencil.git
cd pencil
npm install
```

## Usage

需要开启两个console或者是使用nohup在后台运行, 依次运行以下两个文件

开启本地server, 提供游戏
```
node server.js
```

开启本地client, 作为玩家, 同时也作为pythonapi的server
```
node client.js -p 5051 -r 100
```
或者使用默认值`port 5051, room 100`时不加任何参数
```
node client.js
```

之后执行python
```python
# 一个可能的程序结构, 详见pythondemo.py, 是一个可运行的例子
import time
import pythonapi

class pyAI:
    ...

p=pythonapi.NetworkGame(port=5051)
player=pyAI()
player.setPut(p.putxy)
winlose=[[0,0],[0,0]]
number=100
while number:
    wincheck=-1
    player.setPlayer(p.myid())
    player.setMap(p.getmap())
    while True:
        if not p.ismyturn():
            time.sleep(0.01)
            continue
        wincheck=player.update(p.gethistory())
        if wincheck!=-1:break
        where=player.where()
        print(where)
        player.put(where)
    winlose[player.id][wincheck]+=1
    number-=1
```

需要网页版的AI作为对手时, 可以双击localserver.html  
并在浏览器控制台中执行
```js
player2 = new NetworkPlayer().init(gameview.game,gameview)
player2.queryRoom=function(){this.room=100}
player2.bind(first2)
player1 = new OffensiveKeeperAI().
          init(gameview.game,gameview).bind(1-first2)
```

让两个pythonAI对战的场合, 需要再开启一个`node client.js -p 5052 -r 100`, `room`一致而`port`不同  
```python
p2=pythonapi.NetworkGame(port=5052)
```
## API

**pythonapi.NetworkGame**

+ `gethistory()`  
  返回由没一步的[x,y,id]构成的列表  
  x,y一奇一偶, 是边的坐标  
  id是玩家, `0`代表先手, `1`代表后手

+ `getmap()`  
  以二维数组的形式返回当前的盘面, `List2d[y][x]`, 其中  
  `1`是格点  
  `0`是未填的边  
  `-1`是已填的边  
  `2`是未占据的得分区  
  `4`是先手占据的得分区  
  `8`是后手占据的得分区  
  推荐使用下一条的成员来做判断  
  形如`if number == p.EDGE:`

+ 地图常量
  ```
  POINT=1
  EDGE=0
  SCORE=2
  EDGE_USED=-1
  SCORE_PLAYER=[4,8]
  ```

+ `putxy(x,y)`  
  在x,y处落子  
  会有以下几种返回情况  
  `'lock'`对应游戏未开始或者已经结束, 或者当前是对手的回合  
  `'Invalid click'`表示该点不是能落子的边  
  `'win0'`表示下完此步导致了先手获胜  
  `'win1'`表示下完此步导致了后手获胜  
  `'continueTurn'`表示下完此步后有得分, 仍是自己继续下  
  `'changeTurn'`表示下完此步后无得分, 轮到对手下  

+ `ismyturn()`  
  返回`True`或`False`对应当前是否是自己的回合  
  
+ `myid()`  
  返回`0`或`1`对应自己是先手还是后手











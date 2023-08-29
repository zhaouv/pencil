////////////////// GamePlayer //////////////////
GamePlayer=function(){}

GamePlayer.prototype.bind=function(playerId,callback){
    this.playerId=playerId
    this.player=this.game.player[playerId]
    this.player.pointer=this
    var thisplayer=this
    this.player.changeTurn=function(callback){return thisplayer.changeTurn(callback)}
    this.player.continueTurn=function(callback){return thisplayer.continueTurn(callback)}
    //if(this.game.playerId===playerId && !this.game.lock)this.changeTurn(callback);
    return this
}
GamePlayer.prototype.remove=function(){
    var game=this.game
    this.player.changeTurn=function(callback){game.lock=0}
    this.player.continueTurn=function(callback){}
    this.player.pointer=null
    if(game.playerId===this.playerId)game.lock=0;
}
GamePlayer.prototype.init=function(game){
    this.game=game
    return this
}

GamePlayer.prototype.changeTurn=function(callback){
    //this.game.lock=1
    //计算
    this.game.lock=0
    //this.game.putxy(x,y)
}

GamePlayer.prototype.continueTurn=function(callback){
    //this.game.lock=1
    //计算
    this.game.lock=0
    //this.game.putxy(x,y)
}

////////////////// LocalPlayer //////////////////
LocalPlayer=function(){
    GamePlayer.call(this)
    return this
}
LocalPlayer.prototype = Object.create(GamePlayer.prototype)
LocalPlayer.prototype.constructor = LocalPlayer

LocalPlayer.prototype.changeTurn=function(callback){this.game.lock=0}
LocalPlayer.prototype.continueTurn=function(callback){this.game.lock=0}

////////////////// NetworkPlayer //////////////////
NetworkPlayer=function(){
    GamePlayer.call(this)
    return this
}
NetworkPlayer.prototype = Object.create(GamePlayer.prototype)
NetworkPlayer.prototype.constructor = NetworkPlayer

NetworkPlayer.prototype.changeTurn=function(callback){this.game.lock=1}
NetworkPlayer.prototype.continueTurn=function(callback){this.game.lock=1}

NetworkPlayer.prototype.init=function(game,gameview){
    this.game=game
    this.gameview=gameview
    return this
}
NetworkPlayer.prototype.bind=function(playerId,callback){
    new GamePlayer().bind.call(this,playerId,callback)
    this.game.lock=1
    var thisplayer = this
    thisplayer.emitPut=function(x,y){
        if(thisplayer.game.playerId===thisplayer.playerId)return;
        thisplayer.socket.emit('put', thisplayer.room, [x,y,thisplayer.playerId]);
    }
    thisplayer.restart=function(){
        //重置游戏并交换先后手
        setTimeout(function(){
            var newgame = new Game().init(thisplayer.game.xsize,thisplayer.game.ysize)
            if(thisplayer.gameview){
                var game=newgame
                thisplayer.gameview.init(game,'hasInited')
            }
            var p1=thisplayer.game.player[1].pointer
            var p2=thisplayer.game.player[0].pointer
            p2.init(newgame,thisplayer.gameview).bind(1)
            p1.init(newgame,thisplayer.gameview).bind(0)

            thisplayer.socket.emit('ready', thisplayer.room)
        },1000)
    }
    this.game.changeEdge.push(thisplayer.emitPut)
    if(this.gameview){
        while(this.game.win.length>2)this.game.win.pop();
    }
    this.game.win.push(thisplayer.restart)
    if(!this.room){
        this.queryRoom()
        this.initSocket()
        this.connect()
    }
    return this
}
NetworkPlayer.prototype.remove=function(){
    new GamePlayer().remove.call(this)
    var index = this.game.changeEdge.indexOf(this.emitPut)
    this.game.changeEdge.splice(index,1)
    this.emitPut=null
    var index = this.game.win.indexOf(this.restart)
    this.game.win.splice(index,1)
    this.restart=null
    this.socket.close()
}

NetworkPlayer.prototype.queryRoom=function(){
    // getinput -> room, 0 for rand match
    this.room=0
}
NetworkPlayer.prototype.printtip=function(tip){
    console.log(tip)
    if(this.gameview&&this.gameview.gametip){
        this.gameview.printtip(tip)
    }
}

NetworkPlayer.prototype.initSocket=function(){
    var urlstr=':5050/pencil'
    // http://pencilonline.top/index.html?url=https://h5mota.com:5050/pencil
    if(this.gameview && this.gameview.urlstr)urlstr=this.gameview.urlstr;
    var socket = io(urlstr)
    this.socket=socket
    var thisplayer = this
    var printtip = thisplayer.printtip
    var updateBoard = function(board){
        thisplayer.game.history=board
        if(thisplayer.gameview){
            game=new ReplayController().init(thisplayer.game,thisplayer.gameview).replay(null,0,function(newgame,gameview){
                newgame.lock=0
                var player1 = new LocalPlayer().init(newgame,gameview).bind(0)
                var player2 = new LocalPlayer().init(newgame,gameview).bind(1)
                newgame.win=[]
                newgame.firstStep()
            })
            game.win=[]
            game.firstStep()
        }
    }
    var endgame = function(){
        thisplayer.remove()
    }
    var put_down = function(x, y, type){
        thisplayer.game.lock=0
        thisplayer.game.putxy(x,y)
    }

    // start game
    socket.on('start', function(data, room, board) { // data [xsize,ysize,playerId]
        if(data[2]==-1){
            thisplayer.playerId=-1
            thisplayer.game.setSize(data[0],data[1])
        }
        thisplayer.room=room
        if (data[2]>=0) {
            setTimeout(function(){
                //重置游戏
                var newgame = new Game().init(data[0],data[1])
                if(thisplayer.gameview){
                    var game=newgame
                    thisplayer.gameview.init(game,'hasInited')
                }
                var p1=thisplayer.game.player[0].pointer
                var p2=thisplayer.game.player[1].pointer
                if(data[2]!==thisplayer.playerId){ //交换先后手
                    p1.init(newgame,thisplayer.gameview).bind(1)
                    p2.init(newgame,thisplayer.gameview).bind(0)
                } else {
                    p1.init(newgame,thisplayer.gameview).bind(0)
                    p2.init(newgame,thisplayer.gameview).bind(1)
                }
                
                printtip("连接中！\n你当前"+(data[2]==1?"先手":"后手")+"。")
                thisplayer.socket.emit('ready', thisplayer.room)
            },1000)
        } else {
            printtip("观战模式")
            updateBoard(board)
        }
    })

    socket.on('ready', function() {
        if (thisplayer.playerId>=0) {
            printtip("开始游戏！\n你当前"+(thisplayer.playerId==1?"先手":"后手")+"。")
            thisplayer.ready() //thisplayer.game.lock=thisplayer.playerId==1?0:1
        }
    })

    socket.on('error', function(reason) {
        printtip("\t[错误]"+(reason||"未知错误"))
        endgame()
    })

    socket.on('put', function(data) {
        if (data[2]!=thisplayer.playerId && thisplayer.playerId>=0) {
            put_down(data[0], data[1], data[2])
        }
    })

    socket.on('msg', function (data, room) {
        if (data[1]<0 || data[1]!=thisplayer.playerId) { //-1游客 0先手 1后手 2系统
            printtip((data[1]>=0?"对方消息：":data[1]==2?"":"游客消息：")+data[0]);
        }
    })

    socket.on('board', function (board) {
        if (thisplayer.playerId==-1) {
            updateBoard(board);
        }
    })
}
NetworkPlayer.prototype.connect=function(){
    this.socket.emit('join', this.room, [this.game.xsize, this.game.ysize, this.playerId]); // getinput -> room, 0 for rand match
    var printtip = this.printtip
    printtip("正在等待其他玩家加入，请稍后...")
}
NetworkPlayer.prototype.ready=function(){
    this.game.player[0].changeTurn()
}

////////////////// AIPlayer //////////////////
AIPlayer=function(){
    GamePlayer.call(this)
    return this
}
AIPlayer.prototype = Object.create(GamePlayer.prototype)
AIPlayer.prototype.constructor = AIPlayer

AIPlayer.prototype.init=function(game){
    this.game=game
    this.gameData=new GameData().fromGame(game)
    return this
}
AIPlayer.prototype.bind=function(playerId,callback){
    new GamePlayer().bind.call(this,playerId,callback)
    var thisplayer = this
    thisplayer.emitPut=function(x,y){
        thisplayer.gameData.putxy(x,y)
    }
    thisplayer.emitWin=function(){
    }
    this.game.changeEdge.push(thisplayer.emitPut)
    this.game.win.push(thisplayer.emitWin)
    return this
}
AIPlayer.prototype.remove=function(){
    new GamePlayer().remove.call(this)
    var index = this.game.changeEdge.indexOf(this.emitPut)
    this.game.changeEdge.splice(index,1)
    this.emitPut=null
    var index = this.game.changeEdge.indexOf(this.emitWin)
    this.game.win.splice(index,1)
    this.emitWin=null
}
AIPlayer.prototype.where=function(){
    var gameData=this.gameData
    for(var jj=0;jj<2*gameData.ysize+1;jj++){
        for(var ii=0;ii<2*gameData.xsize+1;ii++){
            if([gameData.EDGE_NOW,gameData.EDGE_NOT,gameData.EDGE_WILL].indexOf(gameData.xy(ii,jj))===-1){
                return {'x':ii,'y':jj};
            }
        }
    }
}
AIPlayer.prototype.changeTurn=function(){
    var thisplayer = this
    thisplayer.game.lock=1
    var where = this.where()
    setTimeout(function(){
        thisplayer.game.lock=0
        thisplayer.game.putxy(where.x,where.y)
    },250)
}
AIPlayer.prototype.continueTurn=function(){
    var thisplayer = this
    thisplayer.game.lock=1
    var where = this.where()
    setTimeout(function(){
        thisplayer.game.lock=0
        thisplayer.game.putxy(where.x,where.y)
    },120)
}

////////////////// GreedyRandomAI //////////////////
GreedyRandomAI=function(){
    AIPlayer.call(this)
    return this
}
GreedyRandomAI.prototype = Object.create(AIPlayer.prototype)
GreedyRandomAI.prototype.constructor = GreedyRandomAI

GreedyRandomAI.prototype.rand=function(n){
    if(!n)return Math.random();
    return ~~(n*Math.random())
}

GreedyRandomAI.prototype.getRandWhere=function(number){
    var gameData=this.gameData
    var count=gameData.edgeCount[number];
    if(!count)return 'not exist';
    var index = this.rand(count)
    // TODO: 修改实现, 改为随机起点找第一个, 或者更快的实现
    for(var jj=0;jj<2*gameData.ysize+1;jj++){
        for(var ii=0;ii<2*gameData.xsize+1;ii++){
            if(gameData.xy(ii,jj)===number){
                if(!index)return {'x':ii,'y':jj};
                index--;
            }
        }
    }
    return 'error'
}

GreedyRandomAI.prototype.tryKeepOffensive=function(){
    // Greedy不维护先手
    return this.getRandWhere(this.gameData.EDGE_NOW)
}

GreedyRandomAI.prototype.where=function(){
    var gameData=this.gameData
    var number = gameData.EDGE_NOW
    if(gameData.edgeCount[gameData.EDGE_NOW]){number = gameData.EDGE_NOW} //有得分块
    else if(gameData.edgeCount[gameData.EDGE_NOT]){number = gameData.EDGE_NOT} //无法得分且无需让分
    else {number = gameData.EDGE_WILL} //需让分
    //
    if(number!==gameData.EDGE_WILL){
        if(number===gameData.EDGE_NOW && gameData.edgeCount[gameData.EDGE_NOT]===0){var where = this.tryKeepOffensive()}
        else {var where = this.getRandWhere(number)}
    } else {
        var where = gameData.getOneEdgeFromRegion(gameData.getMinConnectedRegion())
    }
    return where
}

////////////////// OffensiveKeeperAI //////////////////
OffensiveKeeperAI=function(){
    GreedyRandomAI.call(this)
    return this
}
OffensiveKeeperAI.prototype = Object.create(GreedyRandomAI.prototype)
OffensiveKeeperAI.prototype.constructor = OffensiveKeeperAI

OffensiveKeeperAI.prototype.tryKeepOffensive=function(){
    var gameData=this.gameData
    var eatOne = gameData.getOneEdgeFromRegionIndex(gameData.scoreRegion[0]) // >随便吃一块时的值

    // 最后一块直接吃掉
    if(gameData.regionNum==1) return eatOne;

    // >按照大小分类
    var regions={};
    for(var ii in gameData.connectedRegion){
        var region = gameData.connectedRegion[ii]
        if(!region)continue;
        var len = region.block.length
        regions[len]=regions[len]||[]
        regions[len].push(region.index)
    }

    // 有得分单块
    if(regions[1]){
        for(var ii=0;ii<regions[1].length;ii++){
            var regionIndex=regions[1][ii];
            if(gameData.scoreRegion.indexOf(regionIndex)!==-1)return gameData.getOneEdgeFromRegionIndex(regionIndex);
        }
    }

    // 有得分双块且还有别的能得分的块
    if(regions[2] && gameData.scoreRegion.length>1){
        for(var ii=0;ii<regions[2].length;ii++){
            var regionIndex=regions[2][ii];
            if(gameData.scoreRegion.indexOf(regionIndex)!==-1)return gameData.getOneEdgeFromRegionIndex(regionIndex);
        }
    }

    // 多于两个块按先吃环的顺序吃掉一个
    if(gameData.scoreRegion.length>2){
        for(var ii in gameData.scoreRegion){
            var region = gameData.connectedRegion[gameData.scoreRegion[ii]]
            if(region.isRing)return gameData.getOneEdgeFromRegion(region);
        }
        return eatOne;
    }

    // 两个块且第二个是环
    if(gameData.scoreRegion.length===2 && gameData.connectedRegion[gameData.scoreRegion[1]].isRing)return gameData.getOneEdgeFromRegionIndex(gameData.scoreRegion[1]);

    // 两个块
    if(gameData.scoreRegion.length===2)return eatOne;
    
    // >此时只有一个块了
    var region=gameData.connectedRegion[gameData.scoreRegion[0]];

    // 长度不是4的环
    if(region.isRing && region.block.length!==4)return eatOne;

    // 长度不是2的长条
    if(!region.isRing && region.block.length!==2)return eatOne;

    // >让分数拿先手
    var stack=region.block;
    // 长度是4的环
    if(region.block.length===4) return {'x':(stack[1].x+stack[2].x)/2,'y':(stack[1].y+stack[2].y)/2};
    // 长度是2的长条
    var p1=1
    if(gameData.xy(stack[0].x,stack[0].y)!==gameData.SCORE_3){
        p1=0
    }
    var directions=[{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}]
    for(var ii=0,d;d=directions[ii];ii++){
        var xx=stack[p1].x+d.x, yy=stack[p1].y+d.y
        var xxx=stack[p1].x+2*d.x, yyy=stack[p1].y+2*d.y
        if(gameData.xy(xx,yy)!==gameData.EDGE_USED && gameData.xy(xxx,yyy)=='out range')return {'x':xx,'y':yy};
    }

    console.log('bug:理论上不应该走到这里')
    return eatOne;
}
////////////////// GamePlayer //////////////////
GamePlayer=function(){}

GamePlayer.prototype.bind=function(playerId,callback){
    this.playerId=playerId
    this.player=this.game.player[playerId]
    var AI=this;
    this.player.changeTurn=function(callback){return AI.changeTurn(callback)}
    this.player.continueTurn=function(callback){return AI.continueTurn(callback)}
    if(this.game.playerId===playerId)this.changeTurn(callback);
    return this
}
GamePlayer.prototype.remove=function(){
    this.player.changeTurn=function(callback){game.lock=0}
    this.player.continueTurn=function(callback){}
    if(this.game.playerId===this.playerId)game.lock=0;
}
GamePlayer.prototype.init=function(game){
    this.game=game
    return this
}

GamePlayer.prototype.changeTurn=function(callback){
    //this.game.lock=1
    //计算
    //this.game.lock=0
    //this.game.putxy(x,y)
}

GamePlayer.prototype.continueTurn=function(callback){
    //this.game.lock=1
    //计算
    //this.game.lock=0
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

NetworkPlayer.prototype.bind=function(playerId,callback){
    new GamePlayer().bind.call(this,playerId,callback)
    this.game.lock=1
    this.initSocket()
    var thisplayer = this
    this.sendPutFunc=function(x,y){
        if(thisplayer.game.playerId===thisplayer.playerId)return;
        thisplayer.socket.emit('put', thisplayer.room, [x,y,thisplayer.playerId]);
    }
    this.game.changeEdge.push(this.sendPutFunc)
    this.connect()
    return this
}
NetworkPlayer.prototype.remove=function(){
    new GamePlayer().remove.call(this)
    var index = this.game.changeEdge.indexOf(this.sendPutFunc)
    this.game.changeEdge.splice(index,1)
    this.socket.close()
}

NetworkPlayer.prototype.initSocket=function(){
    var socket = io(':5050/pencil')
    this.socket=socket
    var thisplayer = this
    var printtip = function(tip){console.log(tip)}
    var updateBoard = function(board, pos){}
    var endgame = function(){}
    var put_down = function(x, y, type){
        thisplayer.game.lock=0
        thisplayer.game.putxy(x,y)
    }

    // start game
    socket.on('start', function(data, room, board, pos) {
        // thisplayer.playerId=data //先后手
        thisplayer.room=room
        if (data>=0) {
            printtip("连接中！\n你当前"+(data==0?"先手":"后手")+"。")
            // core.resetMap() // todo
            thisplayer.socket.emit('ready', thisplayer.room)
        } else {
            printtip("观战模式")
            updateBoard(board, pos)
        }
    })

    socket.on('ready', function() {
        if (thisplayer.playerId>=0) {
            thisplayer.game.lock=thisplayer.playerId==1?0:1
            printtip("开始游戏！\n你当前"+(thisplayer.playerId==0?"先手":"后手")+"。")
            thisplayer.ready()
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

    socket.on('board', function (board, pos) {
        if (thisplayer.playerId==-1) {
            updateBoard(board, pos);
        }
    })
}
NetworkPlayer.prototype.connect=function(){
    this.socket.emit('join', 0); // getinput -> room, 0 for rand match
    var printtip = function(tip){console.log(tip)}
    printtip("正在等待其他玩家加入，请稍后...")
}
NetworkPlayer.prototype.ready=function(){}
////////////////// GreedyRandomAI //////////////////
GreedyRandomAI=function(){
    GamePlayer.call(this)
    return this
}
GreedyRandomAI.prototype = Object.create(GamePlayer.prototype)
GreedyRandomAI.prototype.constructor = GreedyRandomAI

GreedyRandomAI.prototype.rand=function(n){
    if(!n)return Math.random();
    return ~~(n*Math.random())
}

GreedyRandomAI.prototype.xy=function(x,y,value){
    if(x<0||x>2*this.game.xsize)return 'out range';
    if(y<0||y>2*this.game.ysize)return 'out range';
    if(value==null)return this.map[y][x];
    this.map[y][x]=value
}

GreedyRandomAI.prototype.count=function(x,y,number){
    var directions=[{x:-1,y:0},{x:1,y:0},{x:0,y:-1},{x:0,y:1}]
    var count=0
    var _cmp=function(a,b){return b.indexOf(a)!==-1}
    if(typeof(number)===typeof(1))_cmp=function(a,b){return a===b};
    for(var ii=0,d;d=directions[ii];ii++){
        var xx=x+d.x, yy=y+d.y
        if(_cmp(this.xy(xx,yy),number))count++;
    }
    return count
}

// game.POINT=1   =>   1000
// game.EDGE=0   =>   [1,10,100] [立刻得分,不得分,差一手得分]
// game.SCORE=2   =>   [10000,10001,10002,10003] 周围边的完成数
// game.EDGE_USED=-1   =>   -100000
// game.SCORE_PLAYER=[4,8]   =>   10004 周围边的完成数
GreedyRandomAI.prototype.initMap=function(){
    var game = this.game
    this.map=JSON.parse(JSON.stringify(game.map))
    this.edgeCount={1:0,10:0,100:0}
    for(var jj=1;jj<2*game.ysize+1;jj+=2){
        for(var ii=1;ii<2*game.xsize+1;ii+=2){
            this.xy(ii,jj,10000+this.count(ii,jj,-1))
        }
    }
    for(var jj=0;jj<2*game.ysize+1;jj++){
        for(var ii=0;ii<2*game.xsize+1;ii++){
            if((ii+jj)%2===0){
                if(ii%2===0)this.xy(ii,jj,1000);
            } else {
                if(this.xy(ii,jj)===-1){
                    this.xy(ii,jj,-100000)
                } else if(this.count(ii,jj,10003)){
                    this.xy(ii,jj,1)
                    this.edgeCount[1]++
                } else if (this.count(ii,jj,10002)) {
                    this.xy(ii,jj,100)
                    this.edgeCount[100]++
                } else {
                    this.xy(ii,jj,10)
                    this.edgeCount[10]++
                }
            }
        }
    }
}

GreedyRandomAI.prototype.getRandWhere=function(number){
    var count=0
    for(var jj=0;jj<2*game.ysize+1;jj++){
        for(var ii=0;ii<2*game.xsize+1;ii++){
            if(this.xy(ii,jj)===number)count++;
        }
    }
    if(!count)return 'not exist';
    var index = this.rand(count)+1
    for(var jj=0;jj<2*game.ysize+1;jj++){
        for(var ii=0;ii<2*game.xsize+1;ii++){
            if(this.xy(ii,jj)===number){
                index--;
                if(!index)return {'x':ii,'y':jj}
            }
        }
    }
    return 'error'
}

GreedyRandomAI.prototype.initConnectedRegion=function(){
    var visited = eval('['+Array(game.ysize+1).join('['+Array(game.xsize+1).join('false,')+'],')+']') // ysize*xsize的false
    var AI=this;
    var v=function(x,y,value){
        if(x<0||x>2*AI.game.xsize)return true;
        if(y<0||y>2*AI.game.ysize)return true;
        if(AI.xy(x,y)!==10002 && AI.xy(x,y)!==10003)visited[y>>1][x>>1]=true;
        if(value==null)return visited[y>>1][x>>1];
        visited[y>>1][x>>1]=value
    }
    var directions=[{x:-1,y:0},{x:1,y:0},{x:0,y:-1},{x:0,y:1}]
    this.connectedRegion={}
    this.connectedRegionKeys=[]
    var stack10003 = []
    for(var y=1;y<2*game.ysize+1;y+=2){
        for(var x=1;x<2*game.xsize+1;x+=2){
            // --x,y-- 
            if(v(x,y))continue;
            var queue=[{'x':x,'y':y}]
            var stack=[]
            while(queue.length){
                var now = queue.shift()
                stack.push(now)
                v(now.x,now.y,true)
                if(this.xy(now.x,now.y)===10003)stack10003.push(stack);
                for(var ii=0,d;d=directions[ii];ii++){
                    var xx=now.x+d.x*2, yy=now.y+d.y*2
                    if(this.xy(now.x+d.x,now.y+d.y)!==100 && this.xy(now.x+d.x,now.y+d.y)!==1)continue;
                    if(v(xx,yy))continue;
                    queue.push({'x':xx,'y':yy})
                }
            }
            var len = stack.length
            if(!this.connectedRegion[len]){
                this.connectedRegionKeys.push(len)
                this.connectedRegion[len]=[stack]
            } else {
                this.connectedRegion[len].push(stack)
            }
            // --x,y-- 
        }
    }
    return stack10003
}

GreedyRandomAI.prototype.minConnectedRegion=function(){
    this.initConnectedRegion()
    var len = Math.min.apply(null,this.connectedRegionKeys)
    var stack = this.connectedRegion[len][0]
    if(len>1)return {'x':(stack[0].x+stack[1].x)/2,'y':(stack[0].y+stack[1].y)/2};
    var directions=[{x:-1,y:0},{x:1,y:0},{x:0,y:-1},{x:0,y:1}]
    for(var ii=0,d;d=directions[ii];ii++){
        var xx=stack[0].x+d.x, yy=stack[0].y+d.y
        if(this.xy(xx,yy)===100)return {'x':xx,'y':yy};
    }
}

GreedyRandomAI.prototype.tryKeepOffensive=function(){
    // Greedy不维护先手
    return this.getRandWhere(1)
}

GreedyRandomAI.prototype.where=function(){
    //if(!this.map)this.initMap();
    this.initMap()
    var number = 1
    if(this.edgeCount[1]){number = 1} //有得分块
    else if(this.edgeCount[10]){number = 10} //无法得分且无需让分
    else {number = 100} //需让分
    //
    if(number!==100){
        if(number===1 && !this.edgeCount[10]){var where = this.tryKeepOffensive()}
        else {var where = this.getRandWhere(number)}
    } else {
        var where = this.minConnectedRegion()
    }
    return where
}

GreedyRandomAI.prototype.changeTurn=function(){
    var thisplayer = this
    thisplayer.game.lock=1
    var where = this.where()
    setTimeout(function(){
        thisplayer.game.lock=0
        thisplayer.game.putxy(where.x,where.y)
    },250)
}
GreedyRandomAI.prototype.continueTurn=function(){
    var thisplayer = this
    thisplayer.game.lock=1
    var where = this.where()
    setTimeout(function(){
        thisplayer.game.lock=0
        thisplayer.game.putxy(where.x,where.y)
    },120)
}

////////////////// OffensiveKeeperAI //////////////////
OffensiveKeeperAI=function(){
    GreedyRandomAI.call(this)
    return this
}
OffensiveKeeperAI.prototype = Object.create(GreedyRandomAI.prototype)
OffensiveKeeperAI.prototype.constructor = OffensiveKeeperAI

OffensiveKeeperAI.prototype.tryKeepOffensive=function(){
    if(
        (this.edgeCount[1]===2||this.edgeCount[1]===1) && 
        (this.edgeCount[100]===1||this.edgeCount[100]===0)
    ) return this.getRandWhere(1); // 最后一块不抢先手直接吃掉

    var stack1=[] //存所有能立刻得分的边
    for(var jj=0;jj<2*game.ysize+1;jj++){
        for(var ii=0;ii<2*game.xsize+1;ii++){
            if(this.xy(ii,jj)===1){
                if(this.count(ii,jj,10002)===0 || stack1.length===2)return {'x':ii,'y':jj};
                stack1.push({'x':ii,'y':jj});
            }
        }
    }

    var stack10003 = this.initConnectedRegion()

    // 有剩余的单双块
    if(this.connectedRegion[1] || (this.connectedRegion[2] && this.connectedRegion[2].length>1))return stack1[0];
    if(this.connectedRegion[2] && this.connectedRegion[2].length==1 && this.connectedRegion[2][0]!==stack10003[0])return stack1[0];

    // 两个长条
    if(stack10003.length===2 && (stack10003[0]!==stack10003[1]))return stack1[0];
    // 一个中心部分的两端长条
    if(stack10003.length===2){
        if(stack10003[0].length!==4)return stack1[0];
    }
    // 一个长条
    if(stack10003.length===1){
        if(stack10003[0].length!==2)return stack1[0];
    }

    //让分数拿先手
    var directions=[{x:-1,y:0},{x:1,y:0},{x:0,y:-1},{x:0,y:1}]
    for(var jj=0,pt;pt=stack10003[0][jj];jj++){
        for(var ii=0,d;d=directions[ii];ii++){
            var xx=pt.x+d.x, yy=pt.y+d.y
            if(this.xy(xx,yy)===100)return {'x':xx,'y':yy};
        }
    }
    console.log('bug:理论上不应该走到这里')
    return this.getRandWhere(1)
}
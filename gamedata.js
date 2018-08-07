////////////////// GameData //////////////////
GameData=function(){
    this.endImmediately=true
}
/* 
GameData {endImmediately: true, xsize: 6, ysize: 6, winScore: 18, totalScore: 36, …}
area : (6) [Array(6), Array(6), Array(6), Array(6), Array(6), Array(6)]
connectedRegion : {}
edgeCount : {1: 0, 10: 84, 100: 0, -100000: 0}
endImmediately : true
map : (13) [Array(13), Array(13), Array(13), Array(13), Array(13), Array(13), Array(13), Array(13), Array(13), Array(13), Array(13), Array(13), Array(13)]
player : (2) [{…}, {…}]
playerId : 0
regionNum : 0
scoreCount : {10000: 36, 10001: 0, 10002: 0, 10003: 0, 10004: 0}
scoreRegion : []
totalScore : 36
winScore : 18
winnerId : null
xsize : 6
ysize : 6
__proto__ : Object
*/
GameData.prototype.xy=function(x,y,value){
    if(x<0||x>2*this.xsize)return 'out range';
    if(y<0||y>2*this.ysize)return 'out range';
    if(value==null)return this.map[y][x];
    this.map[y][x]=value
}
GameData.prototype.count=function(x,y,number){
    var directions=[{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}]
    var count=0
    var _cmp=function(a,b){return a===b}
    if(typeof(number)!==typeof(1))_cmp=function(a,b){return b.indexOf(a)!==-1};
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
// ↓
GameData.prototype.POINT=1000
GameData.prototype.EDGE_USED=-100000
GameData.prototype.EDGE_NOW=1
GameData.prototype.EDGE_WILL=100
GameData.prototype.EDGE_NOT=10
GameData.prototype.SCORE_0=10000
GameData.prototype.SCORE_1=10001
GameData.prototype.SCORE_2=10002
GameData.prototype.SCORE_3=10003
GameData.prototype.SCORE_4=10004
// game.POINT              点
// game.EDGE_USED          用过的边
// game.EDGE_NOW           立刻得分的边
// game.EDGE_WILL          下完后下一笔能立刻得分的边
// game.EDGE_NOT           下完双方不得分的边
// game.SCORE_0            周围有0个边的分
// game.SCORE_1            周围有1个边的分
// game.SCORE_2            周围有2个边的分
// game.SCORE_3            周围有3个边的分
// game.SCORE_4            周围有4个边的分
GameData.prototype.fromGame=function(game){
    var _game=this
    _game.xsize=game.xsize
    _game.ysize=game.ysize
    _game.winScore=game.winScore
    _game.totalScore=game.xsize*game.ysize
    _game.playerId=game.playerId
    _game.winnerId=game.winnerId
    _game.player=[]
    for(var ii=0;ii<2;ii++){
        _game.player.push({
            score:game.player[ii].score,
            id:ii,
        })
    }
    _game.map=_game.cloneObj(game.map)
    _game.edgeCount={}
    _game.edgeCount[_game.EDGE_USED]=0
    _game.edgeCount[_game.EDGE_NOW]=0
    _game.edgeCount[_game.EDGE_WILL]=0
    _game.edgeCount[_game.EDGE_NOT]=0
    _game.scoreCount={}
    _game.scoreCount[_game.SCORE_0]=0
    _game.scoreCount[_game.SCORE_1]=0
    _game.scoreCount[_game.SCORE_2]=0
    _game.scoreCount[_game.SCORE_3]=0
    _game.scoreCount[_game.SCORE_4]=0
    for(var jj=1;jj<2*game.ysize+1;jj+=2){
        for(var ii=1;ii<2*game.xsize+1;ii+=2){
            var thiscount=_game.SCORE_0+_game.count(ii,jj,game.EDGE_USED)
            _game.xy(ii,jj,thiscount)
            _game.scoreCount[thiscount]++
        }
    }
    for(var jj=0;jj<2*game.ysize+1;jj++){
        for(var ii=0;ii<2*game.xsize+1;ii++){
            if((ii+jj)%2===0){
                if(ii%2===0)_game.xy(ii,jj,game.POINT);
            } else {
                if(_game.xy(ii,jj)===game.EDGE_USED){
                    _game.xy(ii,jj,_game.EDGE_USED)
                    _game.edgeCount[_game.EDGE_USED]++
                } else if(_game.count(ii,jj,_game.SCORE_3)){
                    _game.xy(ii,jj,_game.EDGE_NOW)
                    _game.edgeCount[_game.EDGE_NOW]++
                } else if (_game.count(ii,jj,_game.SCORE_2)) {
                    _game.xy(ii,jj,_game.EDGE_WILL)
                    _game.edgeCount[_game.EDGE_WILL]++
                } else {
                    _game.xy(ii,jj,_game.EDGE_NOT)
                    _game.edgeCount[_game.EDGE_NOT]++
                }
            }
        }
    }
    _game.initConnectedRegion()
    return _game
}
GameData.prototype.cloneObj = function (data) {
    //深拷贝一个对象
    //return eval(JSON.stringify(data))
    if (data==null) return data;
    // array
    if (data instanceof Array) {
        var copy=[];
        // for (var i=0;i<data.length;i++) {
        for (var i in data) {
            copy[i] = this.cloneObj(data[i]);
        }
        return copy;
    }
    // object
    if (data instanceof Object) {
        var copy={};
        for (var i in data) {
            if (data.hasOwnProperty(i))
                copy[i]=this.cloneObj(data[i]);
        }
        return copy;
    }
    return data;
}
GameData.prototype.clone=function(){
    var game=this
    var _game=new GameData()
    for(var name in game){
        if(!game.hasOwnProperty(i))continue;
        _game[name]=game.cloneObj(game[name])
    }
    return _game
}
GameData.prototype.initConnectedRegion=function(){
    var game=this
    var visited = eval('['+Array(game.ysize+1).join('['+Array(game.xsize+1).join('false,')+'],')+']') // ysize*xsize的false
    var v=function(x,y,value){
        if(x<0||x>2*game.xsize)return true;
        if(y<0||y>2*game.ysize)return true;
        if(game.xy(x,y)!==game.SCORE_2 && game.xy(x,y)!==game.SCORE_3)visited[y>>1][x>>1]=true;
        if(value==null)return visited[y>>1][x>>1];
        visited[y>>1][x>>1]=value
    }
    var directions=[{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}]
    game.connectedRegion={}
    var stack10003 = []
    game.scoreRegion=stack10003
    var regionNum=0
    for(var y=1;y<2*game.ysize+1;y+=2){
        for(var x=1;x<2*game.xsize+1;x+=2){
            // --x,y-- 
            if(v(x,y))continue;
            regionNum++
            var queue=[{'x':x,'y':y}]
            var region={
                block:[],
                isRing:false,
                index:regionNum,
            }
            while(queue.length){
                var now = queue.shift()
                region.block.push(now)
                v(now.x,now.y,true)
                if(game.xy(now.x,now.y)===game.SCORE_3){
                    if(stack10003.indexOf(region.index)===-1){
                        stack10003.push(region.index)
                    }
                    else region.isRing=true;
                }
                for(var ii=0,d;d=directions[ii];ii++){
                    var xx=now.x+d.x*2, yy=now.y+d.y*2
                    if(game.xy(now.x+d.x,now.y+d.y)!==game.EDGE_WILL && game.xy(now.x+d.x,now.y+d.y)!==game.EDGE_NOW)continue;
                    if(v(xx,yy))continue;
                    queue.push({'x':xx,'y':yy})
                }
            }
            game.connectedRegion[region.index]=region
            // --x,y-- 
        }
    }
    game.regionNum=regionNum
    game.area = eval('['+Array(game.ysize+1).join('['+Array(game.xsize+1).join('0,')+'],')+']') // ysize*xsize的0
    for(var index in game.connectedRegion){
        var region=game.connectedRegion[index]
        for(var ii=0,pt;pt=region.block[ii];ii++){
            game.areaxy(pt.x,pt.y,index)
        }
    }
    //重新排列各region, 并检测无法立刻得分的闭区域是否有环
    for(var index in game.connectedRegion){
        // 这里要注意index是字符串,不能用===
        var region=game.connectedRegion[index]
        if(region.block.length<=2)continue;
        var now=region.block[0]
        var stack=[]
        for(var ii=0,d;d=directions[ii];ii++){
            var x=now.x+d.x*2, y=now.y+d.y*2
            if(game.areaxy(x,y)==index && game.xy(now.x+d.x,now.y+d.y)!==game.EDGE_USED)stack.push({'x':x,'y':y})
        }
        var visited = eval('['+Array(game.ysize+1).join('['+Array(game.xsize+1).join('false,')+'],')+']') // ysize*xsize的false
        var v=function(x,y,value){
            if(x<0||x>2*game.xsize)return true;
            if(y<0||y>2*game.ysize)return true;
            if(game.areaxy(x,y)!=index)visited[y>>1][x>>1]=true;
            if(value==null)return visited[y>>1][x>>1];
            visited[y>>1][x>>1]=value
        }
        v(now.x,now.y,true)
        var link=function(pt,fadd){
            var queue=[pt]
            while(queue.length){
                var pt = queue.shift()
                v(pt.x,pt.y,true)
                fadd(pt)
                for(var ii=0,d;d=directions[ii];ii++){
                    var xx=pt.x+d.x*2, yy=pt.y+d.y*2
                    if(game.xy(pt.x+d.x,pt.y+d.y)!==game.EDGE_WILL && game.xy(pt.x+d.x,pt.y+d.y)!==game.EDGE_NOW)continue;
                    if(v(xx,yy))continue;
                    queue.push({'x':xx,'y':yy})
                }
            }
        }
        var newblock=[now]
        link(stack[0],function(pt){newblock.push(pt)})
        if(stack.length>1){
            if(v(stack[1].x,stack[1].y)===true){
                region.isRing=true
            } else {
                link(stack[1],function(pt){newblock.unshift(pt)})
            }
        }
        region.block=newblock
    }
}
GameData.prototype.areaxy=function(x,y,value){
    var game=this
    if(x<0||x>2*game.xsize)return 'out range';
    if(y<0||y>2*game.ysize)return 'out range';
    if(value==null)return game.area[y>>1][x>>1];
    game.area[y>>1][x>>1]=~~value
}
// game.POINT              点
// game.EDGE_USED          用过的边
// game.EDGE_NOW           立刻得分的边
// game.EDGE_WILL          下完后下一笔能立刻得分的边
// game.EDGE_NOT           下完双方不得分的边
// game.SCORE_0            周围有0个边的分
// game.SCORE_1            周围有1个边的分
// game.SCORE_2            周围有2个边的分
// game.SCORE_3            周围有3个边的分
// game.SCORE_4            周围有4个边的分
GameData.prototype.putxy=function(x,y,callback){
    var game=this
    var edgebefore=game.xy(x,y)
    game.xy(x,y,game.EDGE_USED)
    game.edgeCount[edgebefore]--
    game.edgeCount[game.EDGE_USED]++
    var directions=[{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}]
    var score=false
    for(var ii=0,d;d=directions[ii];ii++){
        var xx=x+d.x, yy=y+d.y
        var scorebefore=game.xy(xx,yy)
        if(scorebefore===game.POINT)continue;
        // if(scorebefore===game.SCORE_4)continue; 不可能发生
        scorenow=scorebefore+1
        game.xy(xx,yy,scorenow)
        game.scoreCount[scorebefore]--
        game.scoreCount[scorenow]++
        //todo 维护联通区域未完成
        if(scorenow===game.SCORE_1){
            //不需要做任何事
        } else if(scorenow===game.SCORE_2){

        } else if(scorenow===game.SCORE_3){

        } else if(scorenow===game.SCORE_4){
            //有图块完成,更新分数
            score=true
            game.player[game.playerId].score++
            if(game.winnerId==null && game.player[game.playerId].score==game.winScore){
                game.winnerId=game.playerId
                if(game.endImmediately)return 'win';
            }
            //更新联通区域
            var index = game.areaxy(xx,yy)
            game.areaxy(xx,yy,0)
            var region=game.connectedRegion[index]
            if(region.block.length===1){
                game.regionNum--
                game.connectedRegion[index]=null
                game.scoreRegion.splice(game.scoreRegion.indexOf(index),1)
            } else {
                // 错的
                if(region.block[0].x===xx && region.block[0].y===yy){
                    region.block=region.block.slice(1)
                } else {
                    region.block=region.block.slice(0,-1)
                }
            }
        }
    }
    if(score){
        return 'continueTurn'
    } else {
        game.playerId=1-game.playerId
        return 'changeTurn'
    }
}

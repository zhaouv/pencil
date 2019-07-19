////////////////// GameData //////////////////
GameData=function(){
    this.endImmediately=true
}
/* 
console.log(gameview.game,new GameData().fromGame(gameview.game))
game=new GameData().fromGame(gameview.game)

GameData {endImmediately: true, xsize: 6, ysize: 6, winScore: 18, totalScore: 36, …}
area : (6) [Array(6), Array(6), Array(6), Array(6), Array(6), Array(6)]
connectedRegion : {}
edgeCount : {1: 0, 10: 84, 100: 0, -100000: 0}
endImmediately : true
map : (13) [Array(13), Array(13), Array(13), Array(13), Array(13), Array(13), Array(13), Array(13), Array(13), Array(13), Array(13), Array(13), Array(13)]
maxIndex : 0
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
// game.POINT=1   =>   -1000
// game.EDGE=0   =>   [1,10,100] [立刻得分,不得分,差一手得分]
// game.SCORE=2   =>   [10000,10001,10002,10003] 周围边的完成数
// game.EDGE_USED=-1   =>   -100000
// game.SCORE_PLAYER=[4,8]   =>   10004 周围边的完成数
// ↓
GameData.prototype.POINT=-888
GameData.prototype.EDGE_USED=-999
GameData.prototype.EDGE_NOW=1111
GameData.prototype.EDGE_WILL=2222
GameData.prototype.EDGE_NOT=3333
GameData.prototype.SCORE_0=1000
GameData.prototype.SCORE_1=1001
GameData.prototype.SCORE_2=1002
GameData.prototype.SCORE_3=1003
GameData.prototype.SCORE_4=1004
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
                if(ii%2===0)_game.xy(ii,jj,_game.POINT);
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
        if(!game.hasOwnProperty(name))continue;
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
        if(game.xy(x,y)!==game.SCORE_2 && game.xy(x,y)!==game.SCORE_3)visited[y>>1][x>>1]=true; // 不关心开放区域和已经被拿的分
        if(value==null)return visited[y>>1][x>>1];
        visited[y>>1][x>>1]=value
    }
    var directions=[{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}]
    game.connectedRegion={}
    var stack10003 = [] // 能得分的区域
    game.scoreRegion=stack10003 
    var regionNum=0
    for(var y=1;y<2*game.ysize+1;y+=2){
        for(var x=1;x<2*game.xsize+1;x+=2){
            // --x,y-- 
            if(v(x,y))continue;
            regionNum++
            var queue=[{'x':x,'y':y}] // 把初始点加入队列
            var region={
                block:[],
                isRing:false,
                index:regionNum,
            } // 创建一个联通区域对象
            while(queue.length){
                var now = queue.shift()
                region.block.push(now) // 此处只是加到集合, 集合内部不反应格子的连接
                // TODO: 如果此处带判断的选择使用push还是unshift, 之后就无需再单独把集合变成反应连接的结构了
                v(now.x,now.y,true)
                if(game.xy(now.x,now.y)===game.SCORE_3){
                    // 当一个区域第一次发现能得分的格子时, 加入得分区域, 
                    // 第二次时标记为有环区域
                    if(stack10003.indexOf(region.index)===-1){
                        stack10003.push(region.index)
                    }
                    else region.isRing=true;
                }
                for(var ii=0,d;d=directions[ii];ii++){
                    // 判断四周的格式是否加到队列
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
    game.maxIndex=regionNum
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
        if(region.block.length<=2)continue; // 长度小于2的自然是连接在一起的
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
GameData.prototype.putxy=function(x,y){
    var game=this
    var edgebefore=game.xy(x,y)
    game.xy(x,y,game.EDGE_USED)
    game.edgeCount[edgebefore]--
    game.edgeCount[game.EDGE_USED]++
    var directions=[{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}]
    var score=false
    var temp=[]
    for(var ii=0,d;d=directions[ii];ii++){ 
        // 其中两个是点, 两个是相邻的区域
        var xx=x+d.x, yy=y+d.y
        var scorebefore=game.xy(xx,yy)
        if(scorebefore===game.POINT || scorebefore==='out range')continue;
        // if(scorebefore===game.SCORE_4)continue; 不可能发生
        scorenow=scorebefore+1
        game.xy(xx,yy,scorenow)
        game.scoreCount[scorebefore]--
        game.scoreCount[scorenow]++
        //维护联通区域
        if(scorenow===game.SCORE_1){
            //不需要做任何事
        } else if(scorenow===game.SCORE_2){
            //把剩下的两条边中的game.EDGE_NOT标记为game.EDGE_WILL
            for(var jj=0,dd;dd=directions[jj];jj++){
                var xxx=xx+dd.x, yyy=yy+dd.y
                if(game.xy(xxx,yyy)!==game.EDGE_NOT)continue;
                game.xy(xxx,yyy,game.EDGE_WILL)
                game.edgeCount[game.EDGE_NOT]--
                game.edgeCount[game.EDGE_WILL]++
            }
            //维护联通区域
            var links=[]
            for(var jj=0,dd;dd=directions[jj];jj++){
                var xxx=xx+dd.x, yyy=yy+dd.y
                if(game.xy(xxx,yyy)===game.EDGE_USED)continue;
                var index_next=game.areaxy(xx+2*dd.x,yy+2*dd.y)
                links.push({
                    //directionindex:jj,
                    index:index_next==='out range'?0:index_next,
                    //direction:dd,
                    x:xx+2*dd.x,
                    y:yy+2*dd.y
                })
            }
            var index=links[0].index
            var region=game.connectedRegion[index]
            //形成环
            if(index===links[1].index && index!=0){
                region.block.push({'x':xx,'y':yy})
                region.isRing=true
                game.areaxy(xx,yy,index)
                continue
            }
            //新区域
            if(index===links[1].index && index==0){
                game.regionNum++
                game.maxIndex++
                region={
                    block:[{'x':xx,'y':yy}],
                    isRing:false,
                    index:game.maxIndex,
                }
                game.connectedRegion[region.index]=region
                game.areaxy(xx,yy,region.index)
                continue
            }
            //其中一个区域上加一格
            if(index==0 || links[1].index==0){
                links[0]=index!=0?links[0]:links[1]
                index=links[0].index
                region=game.connectedRegion[index]
                if(region.block[0].x==links[0].x && region.block[0].y==links[0].y){
                    region.block.unshift({'x':xx,'y':yy})
                } else {
                    region.block.push({'x':xx,'y':yy})
                }
                game.areaxy(xx,yy,index)
                continue
            }
            //合并两个区域
            if(region.block[0].x==links[0].x && region.block[0].y==links[0].y)region.block.reverse();
            var region2=game.connectedRegion[links[1].index]
            if(!(region2.block[0].x==links[1].x && region2.block[0].y==links[1].y))region2.block.reverse();
            region.block=region.block.concat([{'x':xx,'y':yy}]).concat(region2.block)
            game.areaxy(xx,yy,index)
            for(var jj=0,pt;pt=region2.block[jj];jj++){
                game.areaxy(pt.x,pt.y,index)
            }
            var index2index=game.scoreRegion.indexOf(region2.index)
            if(index2index!==-1){
                game.scoreRegion.splice(index2index,1)
                if(game.scoreRegion.indexOf(index)!==-1){
                    region.isRing=true;
                } else {
                    game.scoreRegion.push(index)
                }
            }
            game.connectedRegion[region2.index]=null
            game.regionNum--
        } else if(scorenow===game.SCORE_3){
            //把剩下的一条边标记为 game.EDGE_NOW
            for(var jj=0,dd;dd=directions[jj];jj++){
                var xxx=xx+dd.x, yyy=yy+dd.y
                var edgebefore_nextby=game.xy(xxx,yyy)
                if([game.EDGE_NOT,game.EDGE_WILL].indexOf(edgebefore_nextby)===-1)continue;
                game.xy(xxx,yyy,game.EDGE_NOW)
                game.edgeCount[edgebefore_nextby]--
                game.edgeCount[game.EDGE_NOW]++
                break
            }
            //处理联通区域
            var index = game.areaxy(xx,yy)
            var region=game.connectedRegion[index]
            //有环区域
            if(region.isRing && ii<2){
                for(var jj=0,pt;pt=region.block[jj];jj++){
                    if(pt.x==xx && pt.y==yy)break;
                }
                temp[0]=jj
                continue
            }
            if(region.isRing){
                for(var jj=0,pt;pt=region.block[jj];jj++){
                    if(pt.x==xx && pt.y==yy)break;
                }
                if(Math.abs(jj-temp[0])!=1)continue;
                jj=Math.max(jj,temp[0])
                if(game.scoreRegion.indexOf(index)===-1){
                    var newblock = region.block.slice(jj)
                    newblock=newblock.concat(region.block.slice(0,jj))
                    region.block=newblock
                    game.scoreRegion.push(index)
                } else {
                    //环被取了最边缘的
                    if(jj===1 || jj===region.block.length-1)continue;
                    //一个环分裂成两个环
                    var newblock = region.block.slice(jj)
                    region.block=region.block.slice(0,jj)
                    game.regionNum++
                    game.maxIndex++
                    var newregion={
                        block:newblock,
                        isRing:true,
                        index:game.maxIndex,
                    }
                    game.scoreRegion.push(newregion.index)
                    game.connectedRegion[newregion.index]=newregion
                    for(var jj=0,pt;pt=newregion.block[jj];jj++){
                        game.areaxy(pt.x,pt.y,newregion.index)
                    }
                }
                continue
            }
            //无环区域的边缘
            if(game.areaxy(x-d.x, y-d.y)!=index){
                if(game.scoreRegion.indexOf(index)===-1){
                    game.scoreRegion.push(index)
                } else if(!score){
                    region.isRing=true
                }
                continue
            }
            //无环区域的中心
            if(ii<2)continue;
            for(var jj=0,pt;pt=region.block[jj];jj++){
                if(pt.x==xx && pt.y==yy)break;
                if(pt.x==x-d.x && pt.y==y-d.y)break;
            }
            jj+=1;
            if(game.scoreRegion.indexOf(index)===-1){
                //分裂
                var newblock = region.block.slice(jj)
                region.block=region.block.slice(0,jj)
                game.regionNum+=1
                game.maxIndex+=1
                var newregion={
                    block:newblock,
                    isRing:false,
                    index:game.maxIndex,
                }
                game.scoreRegion.push(index)
                game.scoreRegion.push(newregion.index)
                game.connectedRegion[newregion.index]=newregion
                for(var jj=0,pt;pt=newregion.block[jj];jj++){
                    game.areaxy(pt.x,pt.y,newregion.index)
                }
            } else {
                //被取了最边缘的
                if(jj===1 || jj===region.block.length-1)continue;
                //分裂
                var newblock = region.block.slice(jj)
                region.block=region.block.slice(0,jj)
                game.regionNum+=1
                game.maxIndex+=1
                var newregion={
                    block:newblock,
                    isRing:false,
                    index:game.maxIndex,
                }
                game.scoreRegion.push(newregion.index)
                game.connectedRegion[newregion.index]=newregion
                for(var jj=0,pt;pt=newregion.block[jj];jj++){
                    game.areaxy(pt.x,pt.y,newregion.index)
                }
                if(game.xy(region.block[0].x,region.block[0].y)===game.SCORE_3)region.isRing=true;
                if(game.xy(newregion.block[newregion.block.length-1].x,newregion.block[newregion.block.length-1].y)===game.SCORE_3)newregion.isRing=true;
            }
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
////////////////// Functions for AIPlayer //////////////////
GameData.prototype.getOneEdgeFromRegion=function(region){
    // this region must be in score region
    // not check here for effectiveness
    var gameData=this
    var len = region.block.length
    var stack = region.block
    var p1=0
    var p2=1
    if(gameData.xy(stack[0].x,stack[0].y)!==gameData.SCORE_3){
        p1=len-1
        p2=len-2
    }
    if(len>1)return {'x':(stack[p1].x+stack[p2].x)/2,'y':(stack[p1].y+stack[p2].y)/2};
    var directions=[{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}]
    for(var ii=0,d;d=directions[ii];ii++){
        var xx=stack[p1].x+d.x, yy=stack[p1].y+d.y
        if(gameData.xy(xx,yy)!==gameData.EDGE_USED)return {'x':xx,'y':yy};
    }
}
GameData.prototype.getOneEdgeFromRegionIndex=function(regionIndex){
    // this region must be in score region
    // not check here for effectiveness
    return this.getOneEdgeFromRegion(this.connectedRegion[regionIndex])
}
GameData.prototype.getAllEdgesFromRegion=function(region){
    // this region must be in score region
    // not check here for effectiveness
    var gameData=this
    var len = region.block.length
    var stack = region.block
    var p1=0
    var pend=len-1
    var pd=1
    if(gameData.xy(stack[0].x,stack[0].y)!==gameData.SCORE_3){
        p1=len-1
        pend=0
        pd=-1
    }
    var way=[]
    for(var p=p1;p!=pend;p+=pd){
        var q=p+pd
        way.push({'x':(stack[p].x+stack[q].x)/2,'y':(stack[p].y+stack[q].y)/2})
    }
    if(!region.isRing){
        var directions=[{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}]
        for(var ii=0,d;d=directions[ii];ii++){
            var xx=stack[pend].x+d.x, yy=stack[pend].y+d.y
            var xxx=stack[pend].x+2*d.x, yyy=stack[pend].y+2*d.y
            if(gameData.xy(xxx,yyy)=='out range'){
                way.push({'x':xx,'y':yy})
                break
            }
        }
    }
    return way;
}
GameData.prototype.getAllEdgesFromRegionIndex=function(regionIndex){
    // this region must be in score region
    // not check here for effectiveness
    return this.getAllEdgesFromRegion(this.connectedRegion[regionIndex])
}
GameData.prototype.getMinConnectedRegion=function(){
    var gameData=this
    var minRegion=null
    for(var ii in gameData.connectedRegion){
        var region = gameData.connectedRegion[ii]
        if(!region)continue;
        if(minRegion==null || region.block.length<minRegion.block.length)minRegion=region;
    }
    return minRegion
}
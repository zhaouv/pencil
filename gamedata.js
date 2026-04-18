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
    _game.clearTransientCache()
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
GameData.prototype.clearTransientCache=function(){
    this.__regions=null
    this.__scoreRegions=null
    this.__closedRegions=null
    this.__smallRegions=null
    this.__largeRegions=null
    this.__ringRegions=null
    this.__regionStats=null
    this.__evalFeatures=null
    this.__structureFingerprint=null
    this.__controlFingerprint=null
    this.__safeEdgeAnalyses=null
    this.__sacrificeEdgeAnalyses=null
    this.__irrelevantEdges=null
    this.__controlSwingStructures=null
    this.__structureOpportunitySummary=null
    this.__boardKey=null
}
GameData.prototype.clone=function(){
    var game=this
    var _game=new GameData()
    _game.endImmediately=game.endImmediately
    _game.xsize=game.xsize
    _game.ysize=game.ysize
    _game.winScore=game.winScore
    _game.totalScore=game.totalScore
    _game.playerId=game.playerId
    _game.winnerId=game.winnerId
    _game.regionNum=game.regionNum
    _game.maxIndex=game.maxIndex
    _game.player=[
        {score:game.player[0].score,id:game.player[0].id},
        {score:game.player[1].score,id:game.player[1].id},
    ]
    _game.map=game.map.map(function(row){
        return row.slice()
    })
    _game.area=game.area.map(function(row){
        return row.slice()
    })
    _game.edgeCount={}
    for(var edgeType in game.edgeCount){
        _game.edgeCount[edgeType]=game.edgeCount[edgeType]
    }
    _game.scoreCount={}
    for(var scoreType in game.scoreCount){
        _game.scoreCount[scoreType]=game.scoreCount[scoreType]
    }
    _game.scoreRegion=game.scoreRegion.slice()
    _game.connectedRegion={}
    for(var index in game.connectedRegion){
        var region=game.connectedRegion[index]
        if(!region){
            _game.connectedRegion[index]=null
            continue
        }
        _game.connectedRegion[index]={
            block:region.block.map(function(pt){
                return {'x':pt.x,'y':pt.y}
            }),
            isRing:region.isRing,
            index:region.index,
        }
    }
    _game.clearTransientCache()
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
    game.clearTransientCache()
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
    if(!region || !region.block || !region.block.length)return null
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
    if(!region || !region.block || !region.block.length)return []
    var way=[]
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
    for(var pp=p1;pp!=pend;pp+=pd){
        var qq=pp+pd
        way.push({'x':(stack[pp].x+stack[qq].x)/2,'y':(stack[pp].y+stack[qq].y)/2})
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
    if(way.length){
        var probe=gameData.clone()
        var valid=true
        for(var jj=0,edge;edge=way[jj];jj++){
            if(probe.xy(edge.x,edge.y)!==probe.EDGE_NOW){
                valid=false
                break
            }
            probe.putxy(edge.x,edge.y)
        }
        if(valid)return way
        if(region.block.length>2)return way
    }

    var current=gameData.clone()
    var remain={}
    for(var kk=0,pt;pt=region.block[kk];kk++){
        remain[[pt.x,pt.y].join(',')]=true
    }
    way=[]
    var guard=region.block.length
    while(guard>0 && current.playerId===gameData.playerId && current.edgeCount[current.EDGE_NOW]){
        guard--
        var scoreRegions=current.getScoreRegions()
        var currentRegion=null
        for(var ll=0,item;item=scoreRegions[ll];ll++){
            for(var mm=0,cell;cell=item.block[mm];mm++){
                if(!remain[[cell.x,cell.y].join(',')])continue
                currentRegion=item
                break
            }
            if(currentRegion)break
        }
        if(!currentRegion)break
        var nextEdge=current.getOneEdgeFromRegion(currentRegion)
        if(!nextEdge || current.xy(nextEdge.x,nextEdge.y)!==current.EDGE_NOW)return []
        way.push({'x':nextEdge.x,'y':nextEdge.y})
        current.putxy(nextEdge.x,nextEdge.y)
    }
    return way
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
GameData.prototype.getAllEdgesByType=function(number){
    var gameData=this
    var edges=[]
    for(var y=0;y<2*gameData.ysize+1;y++){
        for(var x=0;x<2*gameData.xsize+1;x++){
            if(gameData.xy(x,y)===number){
                edges.push({'x':x,'y':y})
            }
        }
    }
    return edges
}
GameData.prototype.getAllLegalEdges=function(){
    var gameData=this
    return gameData
        .getAllEdgesByType(gameData.EDGE_NOW)
        .concat(gameData.getAllEdgesByType(gameData.EDGE_NOT))
        .concat(gameData.getAllEdgesByType(gameData.EDGE_WILL))
}
GameData.prototype.getAllEdges=function(number){
    if(number==null)return this.getAllLegalEdges()
    return this.getAllEdgesByType(number)
}
GameData.prototype.getAdjacentCellsFromEdge=function(edge){
    var cells=[]
    var directions=[{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}]
    for(var ii=0,d;d=directions[ii];ii++){
        var xx=edge.x+d.x, yy=edge.y+d.y
        var value=this.xy(xx,yy)
        if(
            value===this.SCORE_0 ||
            value===this.SCORE_1 ||
            value===this.SCORE_2 ||
            value===this.SCORE_3 ||
            value===this.SCORE_4
        ){
            cells.push({'x':xx,'y':yy})
        }
    }
    return cells
}
GameData.prototype.getEdgeRegionIndices=function(edge){
    var cells=this.getAdjacentCellsFromEdge(edge)
    var indices=[]
    var seen={}
    for(var ii=0,cell;cell=cells[ii];ii++){
        var index=this.areaxy(cell.x,cell.y)
        if(index==='out range' || !index || seen[index] || !this.connectedRegion[index])continue
        seen[index]=true
        indices.push(index)
    }
    return indices
}
GameData.prototype.getEdgeGeometryKey=function(edge){
    var gameData=this
    var cells=gameData.getAdjacentCellsFromEdge(edge)
    var minDist=999
    var boundaryCount=0
    var scoreTypes=[]
    for(var ii=0,cell;cell=cells[ii];ii++){
        var cx=(cell.x-1)>>1
        var cy=(cell.y-1)>>1
        var dist=Math.min(cx,cy,gameData.xsize-1-cx,gameData.ysize-1-cy)
        if(dist<minDist)minDist=dist
        if(gameData.regionContainsBoundary({'block':[cell]})){
            boundaryCount++
        }
        scoreTypes.push(gameData.xy(cell.x,cell.y))
    }
    if(minDist===999)minDist=-1
    if(minDist>2)minDist=2
    scoreTypes.sort()
    return [
        edge.x%2===0?'v':'h',
        cells.length,
        boundaryCount,
        minDist,
        scoreTypes.join(','),
    ].join('|')
}
GameData.prototype.getRegions=function(){
    if(this.__regions)return this.__regions
    var gameData=this
    var regions=[]
    for(var ii in gameData.connectedRegion){
        var region = gameData.connectedRegion[ii]
        if(region)regions.push(region)
    }
    this.__regions=regions
    return regions
}
GameData.prototype.getScoreRegions=function(){
    if(this.__scoreRegions)return this.__scoreRegions
    var gameData=this
    var regions=[]
    if(!gameData.edgeCount[gameData.EDGE_NOW]){
        this.__scoreRegions=regions
        return regions
    }
    var allRegions=gameData.getRegions()
    for(var ii=0,region;region=allRegions[ii];ii++){
        for(var jj=0,pt;pt=region.block[jj];jj++){
            if(gameData.xy(pt.x,pt.y)!==gameData.SCORE_3)continue
            regions.push(region)
            break
        }
    }
    this.__scoreRegions=regions
    return regions
}
GameData.prototype.isClosedRegion=function(region){
    if(!region)return false
    for(var ii=0,pt;pt=region.block[ii];ii++){
        if(this.xy(pt.x,pt.y)===this.SCORE_3)return false
    }
    return true
}
GameData.prototype.getClosedRegions=function(){
    if(this.__closedRegions)return this.__closedRegions
    var gameData=this
    this.__closedRegions=gameData.getRegions().filter(function(region){
        return gameData.isClosedRegion(region)
    })
    return this.__closedRegions
}
GameData.prototype.getSmallRegions=function(){
    if(this.__smallRegions)return this.__smallRegions
    this.__smallRegions=this.getClosedRegions().filter(function(region){
        return region.block.length<=2
    })
    return this.__smallRegions
}
GameData.prototype.getLargeRegions=function(){
    if(this.__largeRegions)return this.__largeRegions
    this.__largeRegions=this.getClosedRegions().filter(function(region){
        return region.block.length>=3
    })
    return this.__largeRegions
}
GameData.prototype.getRingRegions=function(){
    if(this.__ringRegions)return this.__ringRegions
    this.__ringRegions=this.getRegions().filter(function(region){
        return region.isRing
    })
    return this.__ringRegions
}
GameData.prototype.regionContainsBoundary=function(region){
    var gameData=this
    for(var ii=0,pt;pt=region.block[ii];ii++){
        if(
            gameData.xy(pt.x-2,pt.y)==='out range' ||
            gameData.xy(pt.x+2,pt.y)==='out range' ||
            gameData.xy(pt.x,pt.y-2)==='out range' ||
            gameData.xy(pt.x,pt.y+2)==='out range'
        ){
            return true
        }
    }
    return false
}
GameData.prototype.countSafeEdges=function(){
    return this.edgeCount[this.EDGE_NOT]||0
}
GameData.prototype.isEndgamePhase=function(){
    return this.countSafeEdges()===0
}
GameData.prototype.getRegionStats=function(){
    if(this.__regionStats)return this.__regionStats
    var gameData=this
    var regions=gameData.getRegions()
    var closedRegions=gameData.getClosedRegions()
    var scoreSet={}
    var scoreRegions=gameData.getScoreRegions()
    for(var ii=0,scoreRegion;scoreRegion=scoreRegions[ii];ii++){
        scoreSet[scoreRegion.index]=true
    }
    var stats={
        regionNum:regions.length,
        closedNum:closedRegions.length,
        scoreRegionNum:0,
        scoreCellNum:0,
        smallClosedNum:0,
        largeClosedNum:0,
        ringNum:0,
        largeRingNum:0,
        largeNonRingNum:0,
        boundaryLargeClosedNum:0,
        innerLargeClosedNum:0,
        maxClosedSize:0,
        maxRegionSize:0,
    }
    for(var rr=0,region;region=regions[rr];rr++){
        var size=region.block.length
        if(size>stats.maxRegionSize)stats.maxRegionSize=size
        if(scoreSet[region.index]){
            stats.scoreRegionNum++
            stats.scoreCellNum+=size
        }
        if(region.isRing){
            stats.ringNum++
        }
    }
    for(var jj=0,closed;closed=closedRegions[jj];jj++){
        var closedSize=closed.block.length
        if(closedSize>stats.maxClosedSize)stats.maxClosedSize=closedSize
        if(closedSize<=2){
            stats.smallClosedNum++
            continue
        }
        stats.largeClosedNum++
        if(closed.isRing){
            stats.largeRingNum++
        } else {
            stats.largeNonRingNum++
        }
        if(gameData.regionContainsBoundary(closed)){
            stats.boundaryLargeClosedNum++
        } else {
            stats.innerLargeClosedNum++
        }
    }
    this.__regionStats=stats
    return stats
}
GameData.prototype.getEvalFeatures=function(){
    if(this.__evalFeatures)return this.__evalFeatures
    var gameData=this
    var stats=gameData.getRegionStats()
    var safeEdgeCount=gameData.countSafeEdges()
    var scoreRegions=gameData.getScoreRegions()
    var closedRegions=gameData.getClosedRegions()
    var features={
        phase:'layout',
        safeEdgeCount:safeEdgeCount,
        scoreEdgeCount:gameData.edgeCount[gameData.EDGE_NOW]||0,
        sacrificeEdgeCount:gameData.edgeCount[gameData.EDGE_WILL]||0,
        irrelevantEdgeCount:0,
        controlSwingCount:0,
        controlZeroParitySignal:0,
        smallParitySignal:(stats.smallClosedNum%2===0)?1:-1,
        safeSmallParitySignal:((safeEdgeCount+stats.smallClosedNum)%2===0)?1:-1,
        largeNonRingParitySignal:(stats.largeNonRingNum%2===0)?1:-1,
        totalSmallCells:0,
        totalLargeCells:0,
        largeChainNum:stats.largeNonRingNum,
        largeRingNum:stats.largeRingNum,
        largeChainCellNum:0,
        largeRingCellNum:0,
        boundaryChainNum:0,
        innerChainNum:0,
        chain3Num:0,
        chain4PlusNum:0,
        ring4Num:0,
        ring6PlusNum:0,
        activeScoreRegionNum:scoreRegions.length,
        activeScoreCellNum:0,
        activeSmallScoreRegionNum:0,
        activeLargeScoreRegionNum:0,
        activeLargeScoreCellNum:0,
        activeRingScoreRegionNum:0,
        activeBoundaryScoreRegionNum:0,
        activeMaxScoreRegionSize:0,
        structureOpportunityZoneNum:0,
        splitOpportunityZoneNum:0,
        criticalSplitZoneNum:0,
        deferredCriticalSplitZoneNum:0,
        blockableDeferredCriticalSplitZoneNum:0,
        lastCriticalSplitZone:0,
        structureOpportunitySignature:'none',
    }

    for(var ii=0,region;region=closedRegions[ii];ii++){
        var size=region.block.length
        if(size<=2){
            features.totalSmallCells+=size
            continue
        }
        features.totalLargeCells+=size
        if(region.isRing){
            features.largeRingCellNum+=size
            if(size===4){
                features.ring4Num++
            } else {
                features.ring6PlusNum++
            }
            continue
        }
        features.largeChainCellNum+=size
        if(size===3){
            features.chain3Num++
        } else {
            features.chain4PlusNum++
        }
        if(gameData.regionContainsBoundary(region)){
            features.boundaryChainNum++
        } else {
            features.innerChainNum++
        }
    }

    for(var jj=0,scoreRegion;scoreRegion=scoreRegions[jj];jj++){
        var scoreSize=scoreRegion.block.length
        features.activeScoreCellNum+=scoreSize
        if(scoreSize>features.activeMaxScoreRegionSize){
            features.activeMaxScoreRegionSize=scoreSize
        }
        if(scoreRegion.isRing){
            features.activeRingScoreRegionNum++
        }
        if(gameData.regionContainsBoundary(scoreRegion)){
            features.activeBoundaryScoreRegionNum++
        }
        if(scoreSize<=2){
            features.activeSmallScoreRegionNum++
        } else {
            features.activeLargeScoreRegionNum++
            features.activeLargeScoreCellNum+=scoreSize
        }
    }

    if(
        safeEdgeCount &&
        (
            gameData.__safeEdgeAnalyses ||
            safeEdgeCount<=12
        )
    ){
        var analyses=gameData.getSafeEdgeAnalyses()
        features.irrelevantEdgeCount=gameData.getIrrelevantEdges(analyses).length
        features.controlSwingCount=gameData.getControlSwingStructures(analyses).length
        if(safeEdgeCount<=12){
            var opportunity=gameData.getStructureOpportunitySummary(analyses)
            features.structureOpportunityZoneNum=opportunity.zoneNum
            features.splitOpportunityZoneNum=opportunity.splitZoneNum
            features.criticalSplitZoneNum=opportunity.criticalSplitZoneNum
            features.deferredCriticalSplitZoneNum=opportunity.deferredCriticalSplitZoneNum
            features.blockableDeferredCriticalSplitZoneNum=
                opportunity.blockableDeferredCriticalSplitZoneNum
            features.lastCriticalSplitZone=opportunity.criticalSplitZoneNum===1?1:0
            features.structureOpportunitySignature=opportunity.signature
        }
    }
    features.controlZeroParitySignal=
        features.controlSwingCount===0?features.safeSmallParitySignal:0

    if(safeEdgeCount===0){
        features.phase='endgame'
    } else if(
        features.scoreEdgeCount>0 ||
        stats.largeClosedNum>0 ||
        features.activeLargeScoreRegionNum>0 ||
        safeEdgeCount<=8
    ){
        features.phase='transition'
    }

    this.__evalFeatures=features
    return features
}
GameData.prototype.getStructureFingerprint=function(stats){
    if(!stats && this.__structureFingerprint)return this.__structureFingerprint
    stats=stats||this.getRegionStats()
    var key=[
        stats.regionNum,
        stats.closedNum,
        stats.scoreRegionNum,
        stats.scoreCellNum,
        stats.smallClosedNum,
        stats.largeClosedNum,
        stats.largeRingNum,
        stats.largeNonRingNum,
        stats.boundaryLargeClosedNum,
        stats.innerLargeClosedNum,
        stats.maxClosedSize,
        stats.maxRegionSize,
    ].join('|')
    if(!stats || stats===this.__regionStats)this.__structureFingerprint=key
    return key
}
GameData.prototype.getControlFingerprint=function(stats){
    var rawOnly=arguments[1]===true
    if(!stats && !rawOnly && this.__controlFingerprint)return this.__controlFingerprint
    stats=stats||this.getRegionStats()
    var key=[
        stats.smallClosedNum,
        stats.largeClosedNum,
        stats.largeRingNum,
        stats.largeNonRingNum,
        stats.boundaryLargeClosedNum,
        stats.innerLargeClosedNum,
        stats.maxClosedSize,
        stats.maxRegionSize,
        this.isEndgamePhase()?1:0,
    ].join('|')
    if(!rawOnly && this.countSafeEdges()<=12){
        key+='|'+this.getStructureOpportunityFingerprint()
    }
    if(!rawOnly && (!stats || stats===this.__regionStats))this.__controlFingerprint=key
    return key
}
GameData.prototype.getOpportunityCriticalKey=function(stats){
    stats=stats||this.getRegionStats()
    return [
        stats.smallClosedNum,
        stats.largeClosedNum,
        stats.largeRingNum,
        stats.largeNonRingNum,
        stats.boundaryLargeClosedNum,
        stats.innerLargeClosedNum,
        stats.maxClosedSize,
    ].join('|')
}
GameData.prototype.getOpportunityNoRingKey=function(stats){
    stats=stats||this.getRegionStats()
    return [
        stats.largeNonRingNum,
        stats.largeRingNum,
    ].join('|')
}
GameData.prototype.applyEdgeClone=function(gameData, edge){
    if(!gameData || !edge)return null
    if(
        [gameData.EDGE_NOW,gameData.EDGE_NOT,gameData.EDGE_WILL]
        .indexOf(gameData.xy(edge.x,edge.y))===-1
    )return null
    var next=gameData.clone()
    next.putxy(edge.x,edge.y)
    return next
}
GameData.prototype.isNearbyOpportunityEdge=function(edge, zone){
    if(!edge || !zone || !zone.length)return false
    for(var ii=0,item;item=zone[ii];ii++){
        var dx=Math.abs(edge.x-item.edge.x)
        var dy=Math.abs(edge.y-item.edge.y)
        if(dx+dy<=2)return true
    }
    return false
}
GameData.prototype.getEdgePointKeys=function(edge){
    if(!edge)return []
    if(edge.x%2===0){
        return [
            [edge.x,edge.y-1].join(','),
            [edge.x,edge.y+1].join(','),
        ]
    }
    return [
        [edge.x-1,edge.y].join(','),
        [edge.x+1,edge.y].join(','),
    ]
}
GameData.prototype.getDelayedOpportunityInfo=function(zone, baseCriticalKey, baseNoRingKey){
    if(!zone || zone.length!==2)return null
    var delayedPaths=[]
    for(var ii=0;ii<zone.length;ii++){
        var first=zone[ii]
        var second=zone[1-ii]
        if(this.getOpportunityCriticalKey(first.afterStats)!==baseCriticalKey)continue;
        var secondState=this.applyEdgeClone(first.state,second.edge)
        if(!secondState)continue;
        var secondStats=secondState.getRegionStats()
        var secondNoRingKey=this.getOpportunityNoRingKey(secondStats)
        if(secondNoRingKey===baseNoRingKey)continue;
        delayedPaths.push({
            firstState:first.state,
            secondEdge:second.edge,
        })
    }
    if(!delayedPaths.length){
        return {
            exists:false,
            blockable:false,
            pathCount:0,
        }
    }
    var allBlockable=true
    for(var jj=0,path;path=delayedPaths[jj];jj++){
        var blockerFound=false
        var blockerEdges=path.firstState.getAllEdges(path.firstState.EDGE_WILL)
        for(var kk=0,blocker;blocker=blockerEdges[kk];kk++){
            if(!this.isNearbyOpportunityEdge(blocker,zone))continue;
            var blockedState=this.applyEdgeClone(path.firstState,blocker)
            if(!blockedState)continue;
            var followState=this.applyEdgeClone(blockedState,path.secondEdge)
            if(!followState){
                blockerFound=true
                break
            }
            if(this.getOpportunityNoRingKey(followState.getRegionStats())===baseNoRingKey){
                blockerFound=true
                break
            }
        }
        if(!blockerFound){
            allBlockable=false
            break
        }
    }
    return {
        exists:true,
        blockable:allBlockable,
        pathCount:delayedPaths.length,
    }
}
GameData.prototype.getStructureOpportunitySummary=function(analyses){
    if(!analyses && this.__structureOpportunitySummary)return this.__structureOpportunitySummary
    analyses=analyses||this.getSafeEdgeAnalyses()
    var summary={
        zoneNum:0,
        splitZoneNum:0,
        criticalSplitZoneNum:0,
        deferredCriticalSplitZoneNum:0,
        blockableDeferredCriticalSplitZoneNum:0,
        signature:'none',
    }
    if(!analyses.length){
        if(!arguments.length || analyses===this.__safeEdgeAnalyses){
            this.__structureOpportunitySummary=summary
        }
        return summary
    }

    var pointKeys=[]
    for(var ii=0,item;item=analyses[ii];ii++){
        pointKeys[ii]=this.getEdgePointKeys(item.edge)
    }

    var visited={}
    var zoneKeys=[]
    var baseCriticalKey=this.getOpportunityCriticalKey(this.getRegionStats())
    var baseNoRingKey=this.getOpportunityNoRingKey(this.getRegionStats())
    for(var start=0;start<analyses.length;start++){
        if(visited[start])continue;
        var queue=[start]
        var zone=[]
        visited[start]=true
        while(queue.length){
            var idx=queue.shift()
            zone.push(analyses[idx])
            var points=pointKeys[idx]
            for(var jj=0;jj<analyses.length;jj++){
                if(visited[jj])continue;
                var otherPoints=pointKeys[jj]
                if(
                    points[0]===otherPoints[0] ||
                    points[0]===otherPoints[1] ||
                    points[1]===otherPoints[0] ||
                    points[1]===otherPoints[1]
                ){
                    visited[jj]=true
                    queue.push(jj)
                }
            }
        }

        summary.zoneNum++
        var fineOutcomes={}
        var criticalOutcomes={}
        var geometryOutcomes={}
        for(var kk=0,zoneItem;zoneItem=zone[kk];kk++){
            var fineKey=[
                zoneItem.structureKey,
                this.getOpportunityCriticalKey(zoneItem.afterStats),
                zoneItem.state.countSafeEdges(),
                zoneItem.state.edgeCount[zoneItem.state.EDGE_WILL],
            ].join('|')
            var criticalKey=this.getOpportunityCriticalKey(zoneItem.afterStats)
            fineOutcomes[fineKey]=true
            criticalOutcomes[criticalKey]=true
            geometryOutcomes[zoneItem.geometryKey+'>'+criticalKey]=true
        }

        var fineList=Object.keys(fineOutcomes).sort()
        var criticalList=Object.keys(criticalOutcomes).sort()
        if(fineList.length>1)summary.splitZoneNum++
        if(criticalList.length>1){
            summary.criticalSplitZoneNum++
            zoneKeys.push([
                'immediate',
                zone.length,
                fineList.length,
                criticalList.length,
                Object.keys(geometryOutcomes).sort().join('&'),
            ].join(':'))
            continue
        }
        var delayedInfo=this.getDelayedOpportunityInfo(zone,baseCriticalKey,baseNoRingKey)
        if(delayedInfo && delayedInfo.exists){
            summary.deferredCriticalSplitZoneNum++
            if(delayedInfo.blockable){
                summary.blockableDeferredCriticalSplitZoneNum++
            }
            zoneKeys.push([
                delayedInfo.blockable?'delayed-blockable':'delayed-owned',
                zone.length,
                delayedInfo.pathCount,
                zone.map(function(item){
                    return [item.edge.x,item.edge.y].join(',')
                }).sort().join('&'),
            ].join(':'))
        }
    }

    if(zoneKeys.length){
        summary.signature=zoneKeys.sort().join('/')
    }
    if(!arguments.length || analyses===this.__safeEdgeAnalyses){
        this.__structureOpportunitySummary=summary
    }
    return summary
}
GameData.prototype.getStructureOpportunityFingerprint=function(analyses){
    return this.getStructureOpportunitySummary(analyses).signature
}
GameData.prototype.getSafeEdgeAnalyses=function(){
    if(this.__safeEdgeAnalyses)return this.__safeEdgeAnalyses
    var gameData=this
    var beforeStats=gameData.getRegionStats()
    var beforeStructureKey=gameData.getStructureFingerprint(beforeStats)
    var beforeControlKey=gameData.getControlFingerprint(beforeStats,true)
    var beforeEndgame=gameData.isEndgamePhase()
    var analyses=[]
    var edges=gameData.getAllEdges(gameData.EDGE_NOT)
    for(var ii=0,edge;edge=edges[ii];ii++){
        var next=gameData.clone()
        next.putxy(edge.x,edge.y)
        var afterStats=next.getRegionStats()
        var structureKey=next.getStructureFingerprint(afterStats)
        var controlKey=next.getControlFingerprint(afterStats,true)
        var endgameNow=next.isEndgamePhase()
        var geometryKey=gameData.getEdgeGeometryKey(edge)
        var geometryParts=geometryKey.split('|')
        var minDist=~~geometryParts[3]
        var boundaryCount=~~geometryParts[2]
        var adjacentCellNum=~~geometryParts[1]
        var geometryScore=0
        geometryScore+=adjacentCellNum*20
        geometryScore+=minDist*12
        geometryScore-=boundaryCount*10
        var swingScore=0
        swingScore+=Math.abs(afterStats.largeNonRingNum-beforeStats.largeNonRingNum)*40
        swingScore+=Math.abs(afterStats.largeRingNum-beforeStats.largeRingNum)*28
        swingScore+=Math.abs(afterStats.innerLargeClosedNum-beforeStats.innerLargeClosedNum)*18
        swingScore+=Math.abs(afterStats.boundaryLargeClosedNum-beforeStats.boundaryLargeClosedNum)*12
        swingScore+=Math.abs(afterStats.smallClosedNum-beforeStats.smallClosedNum)*8
        swingScore+=Math.abs(afterStats.closedNum-beforeStats.closedNum)*6
        swingScore+=Math.abs(afterStats.maxClosedSize-beforeStats.maxClosedSize)*2
        analyses.push({
            edge:{'x':edge.x,'y':edge.y},
            edgeKey:[edge.x,edge.y].join(','),
            geometryKey:geometryKey,
            state:next,
            afterStats:afterStats,
            structureKey:structureKey,
            controlKey:controlKey,
            geometryScore:geometryScore,
            parityKey:[
                (next.countSafeEdges()+afterStats.smallClosedNum)%2===0?1:0,
                geometryKey,
                afterStats.largeNonRingNum,
                afterStats.largeRingNum,
            ].join('|'),
            swingScore:swingScore,
        })
    }
    for(var aa=0,analysis;analysis=analyses[aa];aa++){
        if(analysis.structureKey!==beforeStructureKey)analysis.swingScore+=10
        if(analysis.controlKey!==beforeControlKey)analysis.swingScore+=14
        if(analysis.state.isEndgamePhase()!==beforeEndgame)analysis.swingScore+=20
        analysis.opportunityKey='na'
        analysis.isIrrelevant=analysis.structureKey===beforeStructureKey
        analysis.isControlSwing=
            analysis.controlKey!==beforeControlKey ||
            analysis.state.isEndgamePhase()!==beforeEndgame
    }
    analyses.sort(function(a,b){
        if(a.isControlSwing!==b.isControlSwing)return a.isControlSwing?-1:1
        if(a.isIrrelevant!==b.isIrrelevant)return a.isIrrelevant?1:-1
        return b.swingScore-a.swingScore
    })
    this.__safeEdgeAnalyses=analyses
    return analyses
}
GameData.prototype.getSacrificeEdgeAnalyses=function(){
    if(this.__sacrificeEdgeAnalyses)return this.__sacrificeEdgeAnalyses
    var gameData=this
    var analyses=[]
    var edges=gameData.getAllEdges(gameData.EDGE_WILL)
    for(var ii=0,edge;edge=edges[ii];ii++){
        var next=gameData.clone()
        next.putxy(edge.x,edge.y)
        var geometryKey=gameData.getEdgeGeometryKey(edge)
        var geometryParts=geometryKey.split('|')
        var adjacentCellNum=~~geometryParts[1]
        var boundaryCount=~~geometryParts[2]
        var minDist=~~geometryParts[3]
        var geometryScore=0
        geometryScore+=adjacentCellNum*20
        geometryScore+=minDist*12
        geometryScore-=boundaryCount*10
        var regionIndices=gameData.getEdgeRegionIndices(edge)
        var primaryRegion=null
        for(var jj=0,index;index=regionIndices[jj];jj++){
            var region=gameData.connectedRegion[index]
            if(!region)continue
            if(
                !primaryRegion ||
                region.block.length<primaryRegion.block.length ||
                (region.block.length===primaryRegion.block.length && region.isRing && !primaryRegion.isRing) ||
                (region.block.length===primaryRegion.block.length && region.isRing===primaryRegion.isRing && region.index<primaryRegion.index)
            ){
                primaryRegion=region
            }
        }
        var regionSize=primaryRegion?primaryRegion.block.length:999
        var hasBoundary=primaryRegion?gameData.regionContainsBoundary(primaryRegion):false
        var isRing=primaryRegion?primaryRegion.isRing:false
        var afterStats=next.getRegionStats()
        var openScore=0
        openScore-=regionSize*120
        if(regionSize<=2)openScore+=520
        if(!isRing && regionSize===2)openScore+=180
        if(isRing && regionSize===4)openScore+=220
        if(isRing)openScore+=40
        if(hasBoundary)openScore+=20
        if(!isRing && regionSize===2)openScore+=geometryScore*5
        openScore-=afterStats.largeNonRingNum*40
        openScore-=afterStats.largeRingNum*20
        analyses.push({
            edge:{'x':edge.x,'y':edge.y},
            edgeKey:[edge.x,edge.y].join(','),
            state:next,
            afterStats:afterStats,
            regionIndex:primaryRegion?primaryRegion.index:null,
            regionSize:regionSize,
            isRing:isRing,
            hasBoundary:hasBoundary,
            geometryKey:geometryKey,
            geometryScore:geometryScore,
            categoryKey:[
                regionSize<=2?'small':'large',
                isRing?'ring':'chain',
                hasBoundary?'boundary':'inner',
                regionSize,
            ].join('|'),
            orderBonus:openScore,
        })
    }
    analyses.sort(function(a,b){
        if(a.regionSize!==b.regionSize)return a.regionSize-b.regionSize
        if(a.isRing!==b.isRing)return a.isRing?-1:1
        if(a.hasBoundary!==b.hasBoundary)return a.hasBoundary?-1:1
        return b.orderBonus-a.orderBonus
    })
    this.__sacrificeEdgeAnalyses=analyses
    return analyses
}
GameData.prototype.getIrrelevantEdges=function(analyses){
    if(!analyses && this.__irrelevantEdges)return this.__irrelevantEdges
    analyses=analyses||this.getSafeEdgeAnalyses()
    var edges=[]
    for(var ii=0,item;item=analyses[ii];ii++){
        if(item.isIrrelevant){
            edges.push({'x':item.edge.x,'y':item.edge.y})
        }
    }
    if(!analyses || analyses===this.__safeEdgeAnalyses)this.__irrelevantEdges=edges
    return edges
}
GameData.prototype.getControlSwingStructures=function(analyses){
    if(!analyses && this.__controlSwingStructures)return this.__controlSwingStructures
    analyses=analyses||this.getSafeEdgeAnalyses()
    var groups={}
    for(var ii=0,item;item=analyses[ii];ii++){
        if(!item.isControlSwing)continue;
        var key=item.controlKey
        if(!groups[key]){
            groups[key]={
                key:key,
                analyses:[],
                edges:[],
                swingScore:item.swingScore,
            }
        }
        groups[key].analyses.push(item)
        groups[key].edges.push({'x':item.edge.x,'y':item.edge.y})
        if(item.swingScore>groups[key].swingScore){
            groups[key].swingScore=item.swingScore
        }
    }
    var list=[]
    for(var name in groups){
        var group=groups[name]
        group.analyses.sort(function(a,b){
            return b.swingScore-a.swingScore
        })
        group.edge={'x':group.analyses[0].edge.x,'y':group.analyses[0].edge.y}
        list.push(group)
    }
    list.sort(function(a,b){
        return b.swingScore-a.swingScore
    })
    if(!analyses || analyses===this.__safeEdgeAnalyses)this.__controlSwingStructures=list
    return list
}
GameData.prototype.getBoardKey=function(){
    if(this.__boardKey)return this.__boardKey
    var gameData=this
    var rows=[]
    for(var y=0;y<gameData.map.length;y++){
        rows.push(gameData.map[y].join(','))
    }
    this.__boardKey=[
        gameData.playerId,
        gameData.player[0].score,
        gameData.player[1].score,
        rows.join(';')
    ].join('|')
    return this.__boardKey
}

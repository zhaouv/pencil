
////////////////// TreeSearchAI //////////////////
TreeSearchAI=function(){
    AIPlayer.call(this)
    return this
}
TreeSearchAI.prototype = Object.create(AIPlayer.prototype)
TreeSearchAI.prototype.constructor = TreeSearchAI

//player1 = new TreeSearchAI().init(gameview.game,gameview).bind(1-first2);player1.gameData
//console.log(new GameData().fromGame(gameview.game),player1.gameData)

TreeSearchAI.prototype.changeTurn=function(){
    this.game.lock=0
}
TreeSearchAI.prototype.continueTurn=function(){
    this.game.lock=0
}

TreeSearchAI.prototype.SEARCH_DEPTH=10
TreeSearchAI.prototype.WIN_SCORE=1
TreeSearchAI.prototype.BALANCE_POINT=0
TreeSearchAI.prototype.EVALUATE_AI=OffensiveKeeperAI
TreeSearchAI.prototype.EVALUATE_TIMES=100

TreeSearchAI.prototype.where = function(){
    if(this.way==undefined || this.way.length==0){
        this.way=[]
        this.negamax_count=0
        this.evaluate_count=0
        this.ABcut=0
        search_depth=this.search_depth!=undefined?this.search_depth:this.SEARCH_DEPTH
        this.negamax(this.gameData,search_depth,-Infinity,Infinity)
    }
    return this.way.shift();
}

TreeSearchAI.prototype.put = function(gameData,way){
    for(var ii=0,where;where=way[ii];ii++)gameData.putxy(where.x,where.y);
}

TreeSearchAI.prototype.recover = function(gameData,newGameData,way){
    return gameData;
}

TreeSearchAI.prototype.negamax = function(gameData, deep, alpha, beta){
    this.negamax_count++
    if(gameData.winnerId!=null)return ~~(gameData.winnerId==this.playerId);
    if(deep<=0)return this.evaluate(gameData);
    var best=-Infinity;
    var ways=this.gen(gameData,deep);
    for(var ii=0,way;way=ways[ii];ii++){
        var newGameData=this.put(gameData,way)
        // ?add hash
        var value=-negamax(newGameData, deep-1, -beta, -alpha)
        gameData=this.recover(gameData,newGameData,way)
        if(value>best){
            best=value;
            this.way=way
            if(best==this.WIN_SCORE)return this.WIN_SCORE;
        }
        alpha=Math.max(best,alpha)
        if(value>=beta){
            this.ABcut++
            return value;
        }
        // ?add DFS search when deep<=2
    }
    return best;
}

TreeSearchAI.prototype.evaluate = function(gameData){
    this.evaluate_count++
    var ai=new this.EVALUATE_AI()
    var wincount=0
    for(var ii=0;ii<this.EVALUATE_TIMES;ii++){
        ai.gameData=gameData.clone()
        var where=ai.where()
        while(ai.gameData.putxy(where.x,where.y)!='win'){
            where=ai.where()
        }
        if(ai.gameData.winnerId==this.playerId)wincount++;
    }
    return (wincount/this.EVALUATE_TIMES-0.5)*2;
}

/**
 * @returns {Array.<Array.<{x:Number,y:Number}>>} 路线列表, 路线是坐标的列表
 */
TreeSearchAI.prototype.gen = function(gameData,deep){
    var number = gameData.EDGE_NOW
    if(gameData.edgeCount[gameData.EDGE_NOW]){number = gameData.EDGE_NOW} //有得分块
    else if(gameData.edgeCount[gameData.EDGE_NOT]){number = gameData.EDGE_NOT} //无法得分且无需让分
    else {number = gameData.EDGE_WILL} //需让分
    //
    if(number!==gameData.EDGE_WILL){
        if(number===gameData.EDGE_NOW && gameData.edgeCount[gameData.EDGE_NOT]===0){
            var _tmp = this.tryKeepOffensive(gameData,deep)
            var where = _tmp[0]
            var info = _tmp[1]
        }
        else {var where = this.getRandWhere(number)}
    } else {
        var minRegion=null
        for(var ii in gameData.connectedRegion){
            var region = gameData.connectedRegion[ii]
            if(!region)continue;
            if(minRegion==null || region.block.length<minRegion.block.length)minRegion=region;
        }
        var where = gameData.getOneEdgeFromRegion(minRegion)
    }
    return [[where]]
}

/**
 * @returns {[Array.<Array.<{x:Number,y:Number}>>,Object]} [路线列表,信息], 路线是坐标的列表, 根据信息进一步处理列表
 */
TreeSearchAI.prototype.tryKeepOffensive=function(gameData,deep){
    var eatOne = gameData.getOneEdgeFromRegionIndex(gameData.scoreRegion[0]) // >随便吃一块时的值

    // 最后一块直接吃掉
    if(gameData.regionNum==1) return [[gameData.getAllEdgesFromRegionIndex(gameData.scoreRegion[0])],{finish:true,onlythis:true}];

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
}


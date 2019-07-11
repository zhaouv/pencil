
////////////////// TreeSearchAI //////////////////
TreeSearchAI=function(){
    OffensiveKeeperAI.call(this)
    return this
}
TreeSearchAI.prototype = Object.create(OffensiveKeeperAI.prototype)
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
TreeSearchAI.prototype.BALANCE_POINT=0.5
TreeSearchAI.prototype.EVALUATE_AI=OffensiveKeeperAI

TreeSearchAI.prototype.where = function(){
    this.count=0
    this.ABcut=0
    this.way=null
    var value=this.negamax(this.gameData,this.SEARCH_DEPTH,-Infinity,Infinity)
    if(value>this.BALANCE_POINT){
        return this.way[0];
    } else {
        return this.way[0];
    }
}

TreeSearchAI.prototype.put = function(gameData,way){
    for(var ii=0,where;where=way[ii];ii++)gameData.putxy(where.x,where.y);
}

TreeSearchAI.prototype.recover = function(gameData,newGameData,way){
    return gameData;
}

TreeSearchAI.prototype.negamax = function(gameData, deep, alpha, beta){
    this.count++
    if(gameData.winnerId!=null)return ~~(gameData.winnerId==this.playerId);
    if(deep<=0)return this.evaluate(gameDate);
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

TreeSearchAI.prototype.evaluate = function(gameData){}

TreeSearchAI.prototype.gen = function(gameData,deep){}

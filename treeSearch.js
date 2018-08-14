
////////////////// TreeSearchAI //////////////////
TreeSearchAI=function(){
    GamePlayer.call(this)
    return this
}
TreeSearchAI.prototype = Object.create(GamePlayer.prototype)
TreeSearchAI.prototype.constructor = TreeSearchAI

//player1 = new TreeSearchAI().init(gameview.game,gameview).bind(1-first2);player1.gameData
//console.log(new GameData().fromGame(gameview.game),player1.gameData)

TreeSearchAI.prototype.init=function(game){
    this.game=game
    this.gameData=new GameData().fromGame(game)
    return this
}
TreeSearchAI.prototype.bind=function(playerId,callback){
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
TreeSearchAI.prototype.remove=function(){
    new GamePlayer().remove.call(this)
    var index = this.game.changeEdge.indexOf(this.emitPut)
    this.game.changeEdge.splice(index,1)
    this.emitPut=null
    var index = this.game.changeEdge.indexOf(this.emitWin)
    this.game.win.splice(index,1)
    this.emitWin=null
}

// TreeSearchAI.prototype.changeTurn=function(){
//     var thisplayer = this
//     thisplayer.game.lock=1
//     var where = this.where()
//     setTimeout(function(){
//         thisplayer.game.lock=0
//         thisplayer.game.putxy(where.x,where.y)
//     },250)
// }
// TreeSearchAI.prototype.continueTurn=function(){
//     var thisplayer = this
//     thisplayer.game.lock=1
//     var where = this.where()
//     setTimeout(function(){
//         thisplayer.game.lock=0
//         thisplayer.game.putxy(where.x,where.y)
//     },120)
// }

TreeSearchAI.prototype.where = function(){}
TreeSearchAI.prototype.gen = function(game){}
TreeSearchAI.prototype.evaluate = function(game){}
TreeSearchAI.prototype.negamax = function(game, deep, alpha, beta, role){}

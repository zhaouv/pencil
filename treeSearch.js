
////////////////// TreeSearchAI //////////////////
TreeSearchAI=function(){
    GamePlayer.call(this)
    return this
}
TreeSearchAI.prototype = Object.create(GamePlayer.prototype)
TreeSearchAI.prototype.constructor = TreeSearchAI

TreeSearchAI.prototype.changeTurn=function(){
    var thisplayer = this
    thisplayer.game.lock=1
    var where = this.where()
    setTimeout(function(){
        thisplayer.game.lock=0
        thisplayer.game.putxy(where.x,where.y)
    },250)
}
TreeSearchAI.prototype.continueTurn=function(){
    var thisplayer = this
    thisplayer.game.lock=1
    var where = this.where()
    setTimeout(function(){
        thisplayer.game.lock=0
        thisplayer.game.putxy(where.x,where.y)
    },120)
}

TreeSearchAI.prototype.where = function(){}
TreeSearchAI.prototype.gen = function(game){}
TreeSearchAI.prototype.evaluate = function(game){}
TreeSearchAI.prototype.negamax = function(game, deep, alpha, beta, role){}

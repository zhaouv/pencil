////////////////// Game //////////////////
Game=function(){
    this.xsize=6
    this.ysize=6
}

Game.prototype.POINT=1
Game.prototype.EDGE=0
Game.prototype.SCORE=2
Game.prototype.EDGE_USED=-1
Game.prototype.SCORE_PLAYER=[4,8]

Game.prototype.initMap=function(){
    var game=this
    game.winScore=game.ysize*game.xsize
    game.winScore=game.winScore%2?(game.winScore+1)/2:game.winScore/2
    game.map=[]
    for(var jj=0;jj<2*game.ysize+1;jj++){
        var aa=[]
        for(var ii=0;ii<2*game.xsize+1;ii++){
            aa.push((1-(ii+jj)%2)<<((ii%2)*(jj%2)))
            //格点1, 边0, 得分区域2
        }
        game.map.push(aa)
    }
}
Game.prototype.xy=function(x,y,value){
    var game=this
    if(x<0||x>2*game.xsize)return 'out range';
    if(y<0||y>2*game.ysize)return 'out range';
    if(value==null)return game.map[y][x];
    game.map[y][x]=value
}
Game.prototype.initPlayer=function(){
    var game=this
    game.playerId=0
    game.player=[]
    for(var ii=0;ii<2;ii++){
        game.player.push({
            score:0,
            id:ii,
            changeTurn:function(callback){game.lock=0},
            continueTurn:function(callback){},
        })
    }
}


Game.prototype.putxy=function(x,y,callback){
    var game=this
    if(game.lock){
        if(callback)callback(null,'lock');
        return 'lock';
    }
    if(game.xy(x,y)!==game.EDGE){
        if(callback)callback(null,'Invalid click');
        return 'Invalid click';
    }
    game.xy(x,y,game.EDGE_USED)
    // game.changeEdge
    game.changeEdge.forEach(function(f){f(x,y)})
    var directions=[{x:-1,y:0},{x:1,y:0},{x:0,y:-1},{x:0,y:1}]
    var score=false
    for(var ii=0,d;d=directions[ii];ii++){
        var xx=x+d.x, yy=y+d.y
        if(game.xy(xx,yy)===game.SCORE){
            var complete = true
            for(var jj=0,dd;dd=directions[jj];jj++){
                var xxx=xx+dd.x, yyy=yy+dd.y
                complete = complete && (game.xy(xxx,yyy)===game.EDGE_USED)
            }
            if(complete){
                score=true
                game.xy(xx,yy,game.SCORE_PLAYER[game.playerId])
                game.player[game.playerId].score++
                // game.changeScore
                game.changeScore.forEach(function(f){f(xx,yy,game.playerId,game.player[game.playerId].score)})
                if(game.player[game.playerId].score>=game.winScore){
                    game.win.forEach(function(f){f(game.playerId)})
                    if(callback)callback('win',null);
                    return 'win'
                }
            }
        }
    }
    if(score){
        game.player[game.playerId].continueTurn(callback)
        return 'continueTurn'
    } else {
        game.playerId=1-game.playerId
        game.changePlayer.forEach(function(f){f(game.playerId)})
        game.player[game.playerId].changeTurn(callback)
        return 'changeTurn'
    }
}
Game.prototype.init=function(){
    var game=this
    game.lock=0
    game.initMap()
    game.initPlayer()
    
    game.changeEdge=[]//function(x,y){}
    game.changeScore=[]//function(x,y,playerId,score){}
    game.changePlayer=[]//function(playerId){}
    game.win=[]//function(playerId){}

    game.win.push(function(playerId){
        game.lock=1
    })
}

////////////////// gameview //////////////////
gameview={}

gameview.gamemap = document.getElementById('gamemap')
gameview.gameinfo = document.getElementById('gameinfo')
gameview.x = document.getElementById('gx')
gameview.y = document.getElementById('gy')

gameview.playerColor=['#fbb','#bbf']

gameview.initTable=function(){
    var game=gameview.game
    var hstr=''
    for(var jj=0;jj<2*game.ysize+1;jj++){
        hstr+='<tr>'
        for(var ii=0;ii<2*game.xsize+1;ii++){
            hstr+=['<td><div title="',ii,',',jj,'"></div></td>'].join('')
        }
        hstr+='</tr>\n'
    }
    gameview.gamemap.innerHTML=hstr
}
gameview.xy=function(x,y){return gamemap.children[y].children[x]}
gameview.listen=function(){
    var game=gameview.game
    for(var jj=0;jj<2*game.ysize+1;jj++){
        for(var ii=0;ii<2*game.xsize+1;ii++){
            if((ii+jj)%2===0)continue;
            (function(ii,jj){
                gameview.xy(ii,jj).children[0].onclick=function(){
                    game.putxy(ii,jj)
                }
            })(ii,jj)
        }
    }

    var lastedge = null
    game.changeEdge.push(function(x,y){
        if(lastedge)gameview.xy(lastedge[0],lastedge[1]).children[0].style.background='#ccc'
        gameview.xy(x,y).children[0].style.background='#888'
        lastedge=[x,y]
    })
    game.changeScore.push(function(x,y,playerId,score){
        gameview.xy(x,y).children[0].style.background=gameview.playerColor[playerId]
        gameinfo.children[playerId].children[0].children[0].innerHTML=score
    })
    game.changePlayer.push(function(playerId){
        gameinfo.children[playerId].children[0].children[1].innerHTML='-'
        gameinfo.children[1-playerId].children[0].children[1].innerHTML=''
        gameinfo.children[playerId].style.background=gameview.playerColor[playerId]
        gameinfo.children[1-playerId].style.background=''
    })
    game.win.push(function(playerId){
        gameinfo.children[playerId].children[0].children[1].innerHTML='win'
        setTimeout(function(){
            var replay=confirm('player'+(playerId+1)+' win, replay?')
            if(replay)resetgame(first2);
        },30)
    })
}
gameview.init=function(game){
    gameinfo.children[0].style.background=gameview.playerColor[0]
    gameinfo.children[1].style.background=''
    gameinfo.children[0].children[0].children[0].innerHTML='0'
    gameinfo.children[1].children[0].children[0].innerHTML='0'
    gameinfo.children[0].children[0].children[1].innerHTML='-'
    gameinfo.children[1].children[0].children[1].innerHTML=''
    gameview.game=game
    game.xsize=~~gameview.x.value
    game.ysize=~~gameview.y.value
    game.init()
    gameview.initTable()
    gameview.listen()
}
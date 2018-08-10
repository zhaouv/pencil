////////////////// Game //////////////////
Game=function(){
    this.xsize=6
    this.ysize=6
    this.endImmediately=true
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
    game.history=[]
}
Game.prototype.setSize=function(xsize,ysize){
    var game=this
    if(xsize)game.xsize=xsize;
    if(ysize)game.ysize=ysize;
    game.initMap()
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
            pointer:null,
        })
    }
}
Game.prototype.firstStep=function(callback){
    var game=this
    game.player[game.playerId].changeTurn(callback)
    return game
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
    game.history.push([x,y,game.playerId])
    // game.changeEdge
    game.changeEdge.forEach(function(f){f(x,y)})
    var directions=[{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}]
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
                    var endnow=true
                    if(game.winnerId==null){
                        game.winnerId=game.playerId
                    }
                    if(!game.endImmediately){
                        endnow=(game.player[0].score+game.player[0].score==game.ysize*game.xsize)
                    }
                    if(endnow){
                        game.win.forEach(function(f){f(game.winnerId)})
                        if(callback)callback('win',null);
                        return 'win'+game.playerId
                    }
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
Game.prototype.init=function(xsize,ysize){
    var game=this
    game.lock=1
    game.setSize(xsize,ysize)
    game.initPlayer()
    game.winnerId=null
    
    game.changeEdge=[]//function(x,y){}
    game.changeScore=[]//function(x,y,playerId,score){}
    game.changePlayer=[]//function(playerId){}
    game.win=[]//function(playerId){}

    game.win.push(function(playerId){
        game.lock=1
    })

    return game
}

////////////////// gameview //////////////////
gameview={}

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
gameview.xy=function(x,y){return gameview.gamemap.children[y].children[x]}
gameview.printtip=function(tip){
    gameview.gametip.innerText=tip
}
gameview.listenTable=function(){
    setTimeout(function(){
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
    },100)
}
gameview.buildTable=function(){
    gameview.initTable()
    gameview.listenTable()
}
gameview.listenGame=function(){
    var game=gameview.game
    var lastedge = null
    game.changeEdge.push(function(x,y){
        if(lastedge)gameview.xy(lastedge[0],lastedge[1]).children[0].style.background='#ccc'
        gameview.xy(x,y).children[0].style.background='#888'
        lastedge=[x,y]
    })
    game.changeScore.push(function(x,y,playerId,score){
        gameview.xy(x,y).children[0].style.background=gameview.playerColor[playerId]
        gameview.gameinfo.children[playerId].children[0].children[0].innerHTML=score
    })
    game.changePlayer.push(function(playerId){
        gameview.gameinfo.children[playerId].children[0].children[1].innerHTML='-'
        gameview.gameinfo.children[1-playerId].children[0].children[1].innerHTML=''
        gameview.gameinfo.children[playerId].style.background=gameview.playerColor[playerId]
        gameview.gameinfo.children[1-playerId].style.background=''
    })
    game.win.push(function(playerId){
        gameview.gameinfo.children[playerId].children[0].children[1].innerHTML='win'
    })
    game.win.push(function(playerId){
        setTimeout(function(){
            var replay=confirm((playerId==0?'先手玩家':'后手玩家')+' win, replay?')
            if(replay)resetgame(first2);
        },30)
    })
}
gameview.init=function(game,hasInited){
    gameview.gamemap = document.getElementById('gamemap')
    gameview.gameinfo = document.getElementById('gameinfo')
    gameview.gametip = document.getElementById('gametip')
    gameview.x = document.getElementById('gx')
    gameview.y = document.getElementById('gy')

    var ss = window.location.search
    if(ss.indexOf('url=')!==-1){
        gameview.urlstr=ss.split('url=')[1].split('&')[0]
    }

    gameview.gameinfo.children[0].style.background=gameview.playerColor[0]
    gameview.gameinfo.children[1].style.background=''
    gameview.gameinfo.children[0].children[0].children[0].innerHTML='0'
    gameview.gameinfo.children[1].children[0].children[0].innerHTML='0'
    gameview.gameinfo.children[0].children[0].children[1].innerHTML='-'
    gameview.gameinfo.children[1].children[0].children[1].innerHTML=''
    gameview.game=game
    if(hasInited){
        gameview.x.value=game.xsize
        gameview.y.value=game.ysize
    } else {
        game.init(~~gameview.x.value,~~gameview.y.value)
    }
    gameview.buildTable()
    gameview.listenGame()
    return gameview
}

////////////////// ReplayController //////////////////
ReplayController=function(){

}

ReplayController.prototype.init=function(game,gameview){
    var rc = this
    rc.game=game
    rc.gameview=gameview
    return rc
}

ReplayController.prototype.replay=function(step,time,callback){
    var rc = this
    var newgame = new Game().init(rc.game.xsize,rc.game.ysize)
    rc.newgame = newgame
    if(step=='last'){
        if(rc.game.history.length>=2){
            var index=rc.game.history.length-2
            var lastplayer=rc.game.history[rc.game.history.length-1][2]
            while(index>0){
                if(rc.game.history[index][2]!==lastplayer)break;
                index--;
            }
            step=index
        } else {
            step=null
        }
    }
    if(step==null)step=rc.game.history.length;
    if(time==null)time=10;
    rc.player1 = new LocalPlayer().init(newgame,rc.gameview)
    rc.player2 = new LocalPlayer().init(newgame,rc.gameview)
    if(rc.gameview){
        var game=newgame
        rc.gameview.init(game,'hasInited')
    }
    var stepfunc=function(cb){
        newgame.lock=1
        var func=function(){
            nowstep=newgame.history.length
            if(nowstep<step){
                newgame.lock=0
                newgame.putxy(rc.game.history[nowstep][0],rc.game.history[nowstep][1])
            } else {
                rc.player1.remove()
                rc.player2.remove()
                newgame.lock=1
                if(callback){
                    callback(newgame,rc.gameview)
                } else {
                    newgame.lock=0
                    player2 = new LocalPlayer().init(newgame,rc.gameview).bind(1)
                    player1 = new LocalPlayer().init(newgame,rc.gameview).bind(0)
                    newgame.firstStep()
                }
            }
        }
        if(time){
            setTimeout(func,time)
        } else {
            func()
        }
    }
    rc.player1.changeTurn=rc.player1.continueTurn=stepfunc
    rc.player2.changeTurn=rc.player2.continueTurn=stepfunc
    rc.player2.bind(1)
    rc.player1.bind(0)
    //newgame.firstStep()
    
    return newgame
}
//gamea=JSON.parse( JSON.stringify(game));game=new ReplayController().init(gamea,gameview).replay('last',120,null).firstStep()
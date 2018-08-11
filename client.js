var socketClient = require('socket.io-client')
io = function(){return socketClient('http://localhost:5050/pencil')}

require('./game.js')
require('./gamedata.js')
require('./player.js')
require('./treeSearch.js')


var printlog = console.log;

var http = require('http');

var url = require('url');

var getTime = function() {
    var date = new Date();
    var setTwoDigits = function(x) {return parseInt(x)<10?("0"+x):x;}
    return "[" + 
    date.getFullYear()+"-"+setTwoDigits(date.getMonth()+1)+"-"+setTwoDigits(date.getDate())+" "
    +setTwoDigits(date.getHours())+":"+setTwoDigits(date.getMinutes())+":"+setTwoDigits(date.getSeconds())+
    "] "
}

player1 = null
player2 = null

var server = http.createServer(function (request, response) {
    var pathname = url.parse(request.url).pathname;
    var startwith=function(ss){
        return pathname.slice(1,1+ss.length)===ss
    }
    var game=player2.game
    if(startwith('history')){
        response.writeHead(200)
        response.end(JSON.stringify(game.history))
        return
    }
    if(startwith('map')){
        response.writeHead(200)
        response.end(JSON.stringify(game.map))
        return
    }
    if(startwith('ismyturn')){
        response.writeHead(200)
        response.end(JSON.stringify(!game.lock && player1.playerId==game.playerId))
        return
    }
    if(startwith('myid')){
        response.writeHead(200)
        response.end(JSON.stringify(1-player2.playerId))
        return
    }
    if(startwith('put')){
        var xy=pathname.split('put/')[1].split('-')
        var x=~~xy[0],y=~~xy[1];
        var rp=game.putxy(x,y)
        response.writeHead(200)
        response.end(rp)
        return
    }

    response.writeHead(404);
    response.end('404 Not Found');
    return;
});

var port = 5051 // 默认检测5051端口
var room = 100
var index = process.argv.indexOf('-p')
if (index !== -1) {
  port = parseInt(process.argv[index+1])
}
index = process.argv.indexOf('-r')
if (index !== -1) {
  port = parseInt(process.argv[index+1])
}

server.listen(port, function () {
    printlog(getTime()+'Starting server on port '+port);
});

setroom=function(num){
    num=num||0
    NetworkPlayer.prototype.queryRoom=function(){
        // getinput -> room, 0 for rand match
        this.room=num
    }
}
setroom(room)

first1=0
game = new Game().init(6,6)
// player1 = new OffensiveKeeperAI().init(game).bind(first1)
player1 = new LocalPlayer().init(game).bind(first1)
player2 = new NetworkPlayer().init(game).bind(1-first1)

/* 
player2 = new NetworkPlayer().init(gameview.game,gameview)
player2.queryRoom=function(){this.room=100}
player2.bind(first2)
player1 = new OffensiveKeeperAI().init(gameview.game,gameview).bind(1-first2)
*/
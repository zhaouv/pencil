var socketClient = require('socket.io-client')
io = function(){return socketClient('http://localhost:5050/pencil')}

require('./game.js')
require('./player.js')

var printlog = console.log;

var fs = require('fs');
var http = require('http');

var url = require('url');
var path = require('path');

var root = path.resolve('.');

var getTime = function() {
    var date = new Date();
    var setTwoDigits = function(x) {return parseInt(x)<10?("0"+x):x;}
    return "[" + 
    date.getFullYear()+"-"+setTwoDigits(date.getMonth()+1)+"-"+setTwoDigits(date.getDate())+" "
    +setTwoDigits(date.getHours())+":"+setTwoDigits(date.getMinutes())+":"+setTwoDigits(date.getSeconds())+
    "] "
}

console.log('Static root dir: ' + root);

var server = http.createServer(function (request, response) {
    //POST
    if(request.method==='POST'){
        console.log(getTime()+'POST 200 ' + request.url);

        // request.setEncoding('utf-8')
        var postDataList = [];
        // 数据块接收中
        request.on("data", function (postDataChunk) {
            postDataList.push(postDataChunk);
        })
        request.on("end", function () {
            var postData = postDataList.join('');
            console.log(postData);
            response.writeHead(200);
            response.end('abcabcbac');
        })
        
        return;
    }
    //GET
    var pathname = url.parse(request.url).pathname;
    var filepath = path.join(root, pathname);
    fs.stat(filepath, function (err, stats) {
        if (!err && stats.isFile()) {
            console.log(getTime()+'200 ' + request.url);
            response.writeHead(200);
            fs.createReadStream(filepath).pipe(response);
        } else {
            console.log(getTime()+'404 ' + request.url);
            response.writeHead(404);
            response.end('404 Not Found');
        }
    });
});

/* server.listen(5050, function () {
    printlog(getTime()+'Starting server on port 5050');
}); */

console.log(Game)
first1=0
game = new Game().init(5,5)
player2 = new NetworkPlayer().init(game)
player2.ready=function(){player1 = new OffensiveKeeperAI().init(game).bind(first1)}
player2.bind(1-first1)

console.log('end')
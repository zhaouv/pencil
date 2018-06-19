var socketIO = require('socket.io');
var fs = require('fs');
var http = require('http');

var url = require('url');
var path = require('path');

var root = path.resolve('.');

console.log('Static root dir: ' + root);

var server = http.createServer(function (request, response) {
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

var io = socketIO(server);
var printlog = console.log;

server.listen(5050, function () {
    printlog(getTime()+'Starting server on port 5050');
});

var isset = function (t) {
    if (t == undefined || t == null || (typeof t == "number" && isNaN(t)))
        return false;
    return true;
}

var getTime = function() {
    var date = new Date();
    var setTwoDigits = function(x) {return parseInt(x)<10?("0"+x):x;}
    return "[" + 
    date.getFullYear()+"-"+setTwoDigits(date.getMonth()+1)+"-"+setTwoDigits(date.getDate())+" "
    +setTwoDigits(date.getHours())+":"+setTwoDigits(date.getMinutes())+":"+setTwoDigits(date.getSeconds())+
    "] "
}

const pencil = io.of('/pencil');
pencil.on('connection', function (socket) {

    var wait = function (socket) {
        if (!isset(pencil.adapter.rooms['waiting'])) {
            printlog(getTime()+'Waiting '+socket.id);
            socket.join('waiting');
            return;
        }

        var room = pencil.adapter.rooms['waiting'];

        if (room.length > 0) {
            var temp = pencil.connected[Object.keys(room.sockets)[0]];

            var rand = parseInt(Math.random() * 2147483647) + 100;
            while (isset(pencil.adapter.rooms[rand]) && pencil.adapter.rooms[rand].length > 0) {
                rand = parseInt(Math.random() * 2147483647) + 100;
            }

            socket.join(rand);
            temp.leave('waiting');
            temp.join(rand);

            printlog(getTime()+'Match '+rand+": "+temp.id+" with "+socket.id);

            temp.emit('start', 1, rand);
            socket.emit('start', 2, rand);
            printlog(getTime()+rand+" start!");

            var curr = pencil.adapter.rooms[rand];
            
            curr.first = temp.id;
            curr.second = socket.id;
            curr.board = [];
            for (var i=0;i<169;i++) curr.board.push(0);
            curr.pos = [];

            return;
        }

        socket.join('waiting');
    }

    socket.on('join', function (id) {
        if (id == 0) {
            wait(socket);
            return;
        }
        var room = pencil.adapter.rooms[id];
        if (isset(room) && room.length >= 2) {
            // pencil.in(socket.id).emit('error', '房间已满');
            printlog(getTime()+id+" visitor: "+socket.id);
            socket.join(id);
            pencil.in(id).emit('msg', ["目前观战人数："+(room.length-2), 0]);
            socket.emit('start', -1, id, room.board.join(""), room.pos);
            return;
        }
        var first = null;
        if (isset(room) && room.length == 1) {
            first = pencil.connected[Object.keys(room.sockets)[0]];
        }
        socket.join(id);
        printlog(getTime()+id+" player: "+socket.id);
        if (isset(first)) {
            room = pencil.adapter.rooms[id];
            first.emit('start', 1, id);
            socket.emit('start', 2, id);
            printlog(getTime()+id+" start!");
            room.first = first.id;
            room.second = socket.id;
            room.board = [];
            for (var i=0;i<169;i++) room.board.push(0);
            room.pos = [];
        }
    });

    socket.on('ready', function (id) {
        var room = pencil.adapter.rooms[id];
        if (!isset(room)) {
            pencil.in(id).emit('error', '未知错误');
            return;
        }
        if (!isset(room.count)) room.count = 0;
        room.count++;
        printlog(getTime()+id+" ready: "+socket.id);
        if (room.count == 2) {
            delete room.count;
            pencil.in(id).emit('ready');
            room.board = [];
            for (var i=0;i<169;i++) room.board.push(0);
            room.pos = [];
            pencil.in(id).emit('board', room.board.join(""), room.pos);
        }
    })

    socket.on('put', function (id, data) {
        printlog(getTime()+id+": "+data);
        pencil.in(id).emit('put', data);

        var room = pencil.adapter.rooms[id];
        if (!isset(room) || !isset(room.board) || !isset(room.pos)) return;
        var x = data[0], y = data[1];
        room.board[13*x+y] = data[2];
        room.pos = [x,y];
        pencil.in(id).emit('board', room.board.join(""), room.pos);
    })

    socket.on('msg', function (id, data) {
        printlog(getTime()+id+": "+data);
        pencil.in(id).emit('msg', data);
    })

    socket.on('disconnecting', function () {
        Object.keys(socket.rooms).forEach(function (id) {
            // pencil.in(id).emit('error', '对方断开了链接');
            var room = pencil.adapter.rooms[id];
            if (id!=socket.id)
                printlog(getTime()+id+" disconnect: "+socket.id);
            if (isset(room) && isset(room.first) && isset(room.second)) {
                if (room.first==socket.id || room.second==socket.id) {
                    pencil.in(id).emit('error', '对方断开了连接');
                    return;
                }
                pencil.in(id).emit('msg', ["目前观战人数："+(pencil.adapter.rooms[id].length-3), 0]);
                return;
            }
            pencil.in(id).emit('error', '对方断开了连接');
        });
    })
});



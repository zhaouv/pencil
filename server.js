var socketIO = require('socket.io');

var http = require('http');

var server = http.createServer();

var io = socketIO(server);

server.listen(5050, function () {
    console.log(getTime()+'Starting server on port 5050');
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
    var printlog = console.log;
    var wait = function (socket, data) { // data [xsize,ysize,playerId]
        if (!isset(pencil.adapter.rooms['waiting'])) {
            printlog(getTime()+'Waiting '+socket.id);
            socket.join('waiting');
            pencil.adapter.rooms['waiting'].data=data
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

            data=room.data
            temp.emit('start', data, rand);
            var data2=[data[0],data[1],1-data[2]];
            socket.emit('start', data2, rand);
            printlog(getTime()+rand+" start!");

            var curr = pencil.adapter.rooms[rand];
            
            curr.first = temp.id;
            curr.second = socket.id;
            curr.board = [];

            return;
        }

        socket.join('waiting');
    }

    socket.on('join', function (id, data) { // data [xsize,ysize,playerId]
        if (id == 0) {
            wait(socket, data);
            return;
        }
        var room = pencil.adapter.rooms[id];
        if (isset(room) && room.length >= 2) {
            // pencil.in(socket.id).emit('error', '房间已满');
            printlog(getTime()+id+" visitor: "+socket.id);
            socket.join(id);
            pencil.in(id).emit('msg', ["目前观战人数："+(room.length-2), 2]);
            data=room.data
            var data3=[data[0],data[1],-1];
            socket.emit('start', data3, id, room.board);
            return;
        }
        var first = null;
        if (isset(room) && room.length == 1) {
            first = pencil.connected[Object.keys(room.sockets)[0]];
        }
        socket.join(id);
        if (!isset(room)){
            pencil.adapter.rooms[id].data=data
        }
        printlog(getTime()+id+" player: "+socket.id);
        if (isset(first)) {
            room = pencil.adapter.rooms[id];
            data=room.data
            first.emit('start', data, id);
            var data2=[data[0],data[1],1-data[2]];
            socket.emit('start', data2, id);
            printlog(getTime()+id+" start!");
            room.first = first.id;
            room.second = socket.id;
            room.board = [];
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
            pencil.in(id).emit('board', room.board);
        }
    })

    socket.on('put', function (id, data) {
        printlog(getTime()+id+": "+data);
        pencil.in(id).emit('put', data);

        var room = pencil.adapter.rooms[id];
        if (!isset(room) || !isset(room.board)) return;
        room.board.push(data);
        pencil.in(id).emit('board', room.board);
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
                pencil.in(id).emit('msg', ["目前观战人数："+(pencil.adapter.rooms[id].length-3), 2]);
                return;
            }
            pencil.in(id).emit('error', '对方断开了连接');
        });
    })
});



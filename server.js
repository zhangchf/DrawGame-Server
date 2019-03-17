const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 3000;

const questions = require('./questions');
console.log('questions: ' + JSON.stringify(questions));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/public/index.html');
});

var sockets = [];
var scores = 0;
var names = {};

var drawerIndex = 0;


var leaderboard = {
    "Tom and Jerry": 83,
    "Jack and Rose": 77,
    "Juliet and Romeo": 70,
    "Mary and Amy": 46,
    "Micky and Minnie": 32,
}

var questionIndex = 0;

function sendQuestion() {
    let drawerId = sockets[drawerIndex].id;
    let question = questions[questionIndex];
    console.log('quiz start: ' + JSON.stringify(question));
    question['drawer'] = names[drawerId];
    io.emit('quizStart', question);
    console.log('drawer: ' + question['drawer']);
    drawerIndex++;
    drawerIndex = drawerIndex%2;
}

io.on('connection', function (socket) {
    console.log('a user connected ' + socket.id);

    sockets.push(socket);

    socket.on('register',
        function(name) {
            names[socket.id] = name;
            console.log('register, id: ' + socket.id+'; name: '+ name);

            //the 1st question starting
            if (Object.keys(names).length >= 2) {
                questionIndex = 0;
                console.log('names >= 2, game starting');
                sendQuestion(socket);
            }
        });

    socket.on('submit', function (result) {
        console.log("submit: " + result);
        if (result) {
            scores++;
        }
        questionIndex++;
        if (questionIndex < questions.length) {
            sendQuestion(socket);
        } else {
            questionIndex = 0;
            let groupName = "";
            for (key in names) {
                groupName += names[key] + " and ";
            }
            groupName = groupName.substring(0, groupName.length - 5);
            leaderboard[groupName] = 99;
            console.log('leaderboard:' + leaderboard);
            io.emit('leaderboard', leaderboard);
        }
        
    });


    socket.on('syncImage', function(msg) {
        console.log('syncImage:' + msg);
        socket.broadcast.emit('drawing', msg);
    });

    socket.on('msg-echo', function(...data) {
        console.log('received "echo" message: ' + data);
        io.to(socket.id).emit('msg-echo-back', ...data);
    });

    socket.on('disconnect', function () {
        console.log('user disconnected: '+socket.id);
        for (var i = sockets.length - 1; i >= 0; i--) {
            if (sockets[i] === socket) {
                sockets.splice(i, 1);
            }
        }
        delete names[socket.id];
        console.log('user left:', names);
    });
});


http.listen(PORT, function () {
    console.log(`listening on *:${PORT}`);
});
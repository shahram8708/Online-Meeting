const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(__dirname + '/public'));

const users = {};

io.on('connection', (socket) => {
    console.log('New user connected');

    socket.on('join', ({ userId, userName }) => {
        users[userId] = userName;
        console.log(`User ${userId} joined the meeting`);
    });

    socket.on('joinRequest', ({ userId, otherUserId }) => {
        if (users[otherUserId]) {
            socket.emit('joinResponse', { success: true });
            socket.to(otherUserId).emit('joinRequest', { userId });
        } else {
            socket.emit('joinResponse', { success: false });
        }
    });

    socket.on('disconnect', () => {
        const userId = getKeyByValue(users, socket.id);
        if (userId) {
            delete users[userId];
            console.log(`User ${userId} left the meeting`);
        }
    });

    socket.on('chatMessage', ({ userId, userName, message }) => {
        io.emit('chatMessage', { userId, userName, message });
    });

    socket.on('callUser', ({ userIdToCall, signalData }) => {
        const socketId = users[userIdToCall];
        io.to(socketId).emit('incomingCall', { signalData, from: socket.id });
    });

    socket.on('acceptCall', ({ receiverId, signalData }) => {
        io.to(receiverId).emit('callAccepted', signalData);
    });
});

function getKeyByValue(object, value) {
    return Object.keys(object).find(key => object[key] === value);
}

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});

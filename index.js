const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const users = {};

io.on('connection', (socket) => {
  console.log('New user connected');

  socket.on('join', (userData) => {
    const { userId, userName } = userData;
    users[userId] = socket.id;
    console.log(`User ${userName} (${userId}) joined the meeting`);

    // Notify other users about the new participant
    socket.broadcast.emit('userJoined', { userId, userName });
  });

  socket.on('disconnect', () => {
    const userId = getKeyByValue(users, socket.id);
    if (userId) {
      const userName = users[userId];
      delete users[userId];
      console.log(`User ${userName} (${userId}) left the meeting`);

      // Notify other users about the participant who left
      io.emit('userLeft', { userId, userName });
    }
  });

  socket.on('callUser', ({ userToCall, signalData }) => {
    const socketId = users[userToCall];
    io.to(socketId).emit('incomingCall', { signalData, from: socket.id });
  });

  socket.on('acceptCall', ({ callerId, signalData }) => {
    io.to(users[callerId]).emit('callAccepted', { signalData, receiverId: socket.id });
  });

  socket.on('chatMessage', ({ userId, message }) => {
    const userName = users[userId];
    io.emit('chatMessage', { userId, userName, message });
  });
});

function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});

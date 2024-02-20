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

  socket.on('join', (userId) => {
    users[userId] = socket.id;
    console.log(`User ${userId} joined the meeting`);

    // Notify other users about the new participant
    io.emit('userJoined', userId);
  });

  socket.on('disconnect', () => {
    const userId = getKeyByValue(users, socket.id);
    if (userId) {
      delete users[userId];
      console.log(`User ${userId} left the meeting`);

      // Notify other users about the participant who left
      io.emit('userLeft', userId);
    }
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

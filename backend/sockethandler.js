const { saveMessage, getRoomMessages, searchMessages, markRoomSeen, updateMessageStatus } = require('./db');

const users = {};

function socketHandler(io) {
  io.on('connection', (socket) => {

    socket.on('joinRoom', async ({ username, room }) => {
      users[socket.id] = { username, room };
      socket.join(room);

      // Mark all existing messages as delivered for this user
      try {
        await markRoomSeen(room, username);
        const history = await getRoomMessages(room);
        socket.emit('messageHistory', history);
      } catch (err) {
        console.error('Error loading history:', err.message);
      }

      socket.to(room).emit('notification', {
        message: `${username} has joined the room`,
        timestamp: getTime(),
      });

      io.to(room).emit('roomUsers', getRoomUsers(io, room, users));
    });

    // Send message
    socket.on('chatMessage', async (msg) => {
      const user = users[socket.id];
      if (!user || !msg.trim()) return;

      const timestamp = getTime();
      let messageId;

      try {
        messageId = await saveMessage(user.username, user.room, msg.trim());
      } catch (err) {
        console.error('Error saving message:', err.message);
        return;
      }

      // Emit to sender as 'sent'
      socket.emit('chatMessage', {
        id: messageId,
        username: user.username,
        message: msg.trim(),
        timestamp,
        status: 'sent',
      });

      // Emit to others as 'delivered'
      socket.to(user.room).emit('chatMessage', {
        id: messageId,
        username: user.username,
        message: msg.trim(),
        timestamp,
        status: 'delivered',
      });

      // Update status to delivered in DB
      try {
        await updateMessageStatus(messageId, 'delivered');
        socket.emit('messageStatus', { id: messageId, status: 'delivered' });
      } catch (err) {
        console.error('Error updating status:', err.message);
      }
    });

    // Mark messages as seen when user reads them
    socket.on('markSeen', async ({ room }) => {
      const user = users[socket.id];
      if (!user) return;
      try {
        await markRoomSeen(room, user.username);
        socket.to(room).emit('messagesSeen', { by: user.username });
      } catch (err) {
        console.error('Error marking seen:', err.message);
      }
    });

    // Search messages
    socket.on('searchMessages', async ({ room, query }) => {
      if (!query.trim()) return;
      try {
        const results = await searchMessages(room, query);
        socket.emit('searchResults', results);
      } catch (err) {
        console.error('Search error:', err.message);
      }
    });

    // Typing
    socket.on('typing', () => {
      const user = users[socket.id];
      if (!user) return;
      socket.to(user.room).emit('typing', { username: user.username });
    });

    socket.on('stopTyping', () => {
      const user = users[socket.id];
      if (!user) return;
      socket.to(user.room).emit('stopTyping', { username: user.username });
    });

    // Disconnect
    socket.on('disconnect', () => {
      const user = users[socket.id];
      if (!user) return;
      const { username, room } = user;
      delete users[socket.id];

      io.to(room).emit('notification', {
        message: `${username} has left the room`,
        timestamp: getTime(),
      });
      io.to(room).emit('roomUsers', getRoomUsers(io, room, users));
    });
  });
}

function getTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getRoomUsers(io, room, users) {
  const roomSocketIds = Array.from(io.sockets.adapter.rooms.get(room) || []);
  return roomSocketIds.filter((id) => users[id]).map((id) => users[id].username);
}

module.exports = socketHandler;
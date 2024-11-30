const Room = require('../models/room');

const chatService = {
  initialize: (io) => {
    io.on('connection', (socket) => {
      console.log('New client connected');

      // Existing room management events
      socket.on('joinRoom', async ({ roomId, userId, username }) => {
        try {
          const roomData = await Room.getRoom(roomId);
          if (!roomData) {
            throw new Error('Room not found');
          }
          
          socket.join(roomId);
          socket.to(roomId).emit('userJoined', { 
            username, 
            userId,
            message: 'User joined the room' 
          });
          
          // Send current peers list to the new user
          const peers = Array.from(io.sockets.adapter.rooms.get(roomId) || [])
            .filter(id => id !== socket.id);
          socket.emit('currentPeers', peers);
          
          console.log(`User ${userId}:${username} joined room ${roomId}`);
        } catch (error) {
          console.error('Error joining room:', error);
          socket.emit('error', { message: 'Failed to join room' });
        }
      });

      socket.on('leaveRoom', ({ roomId, userId, username }) => {
        socket.leave(roomId);
        socket.to(roomId).emit('userLeft', { 
          username, 
          userId,
          message: 'User left the room' 
        });
        console.log(`User ${userId}:${username} left room ${roomId}`);
      });

      // Chat message handling
      socket.on('sendMessage', ({ roomId, userId, message, username }) => {
        io.to(roomId).emit('newMessage', { username, userId, message });
        console.log(`New message in room ${roomId} from user ${userId}:${username}: ${message}`);
      });

      // WebRTC Signaling
      socket.on('startCall', ({ roomId, userId }) => {
        socket.to(roomId).emit('userStartedCall', { userId });
      });

      socket.on('offer', ({ target, sdp, userId }) => {
        socket.to(target).emit('offer', { 
          source: socket.id,
          sdp,
          userId 
        });
      });

      socket.on('answer', ({ target, sdp, userId }) => {
        socket.to(target).emit('answer', { 
          source: socket.id,
          sdp,
          userId 
        });
      });

      socket.on('iceCandidate', ({ target, candidate, userId }) => {
        socket.to(target).emit('iceCandidate', { 
          source: socket.id,
          candidate,
          userId 
        });
      });

      socket.on('disconnect', () => {
        const rooms = Array.from(socket.rooms);
        rooms.forEach(roomId => {
          socket.to(roomId).emit('peerDisconnected', { 
            peerId: socket.id 
          });
        });
        console.log('Client disconnected');
      });
    });
  }
};

module.exports = chatService;
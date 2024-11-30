const { db } = require('../firebase/firebase');

const gameDataService = {
  initializeGameData: async (roomId) => {
    try {
      const roomDoc = await db.collection('rooms').doc(roomId).get();
      if (!roomDoc.exists) {
        throw new Error('Room does not exist');
      }
  
      const roomData = roomDoc.data();
      const initialGameData = {
        roomId,
        owner: roomData.owner,
        players: roomData.playerList,
        createdAt: roomData.createdAt,
        winner: roomData.winner,
        isTerminated: roomData.isTerminated,
        lastActive: roomData.lastActiveAt,
        gameDuration: 0,
       };
  
      await db.collection('gameData').doc(roomId).set(initialGameData);
      console.log('Game data initialized successfully for room:', roomId);
    } catch (error) {
      console.error('Error initializing game data:', error);
      throw error;
    }
  },

  getUserGamesAndWins: async (userId) => {
    try {
      console.log(`Fetching games and wins for user: ${userId}`);
      const gamesSnapshot = await db.collection('gameData').get();

      let gamesCount = 0;
      let winsCount = 0;

      gamesSnapshot.forEach(doc => {
        const gameData = doc.data();
        if (gameData.players.some(player => player.userId === userId)) {
          gamesCount++;
          if (gameData.winner && gameData.winner.userId === userId) {
            winsCount++;
          }
        }
      });

      console.log(`Games played by user ${userId}: ${gamesCount}, Games won: ${winsCount}`);
      
      return { gamesCount, winsCount };
    } catch (error) {
      console.error('Error getting user games and wins count:', error);
      throw error;
    }
  },

  updateGameData: async (roomId, updateData) => {
    try {
      const gameDataDoc = await db.collection('gameData').doc(roomId).get();

      // Ensure lastActiveAt and createdAt are Date objects
      const lastActiveAt = updateData.lastActiveAt;
      const lastCreatedAt = updateData.createdAt.toDate();

      const gameDuration = lastActiveAt - lastCreatedAt;

      const gameUpdate = {
        owner: updateData.owner,
        players: updateData.playerList,
        createdAt: updateData.createdAt,
        winner: updateData.winner,
        isTerminated: updateData.isTerminated,
        lastActive: updateData.lastActiveAt,
        terminatedAt: updateData.terminatedAt,
        gameDuration: gameDuration,
      };

      if (gameDataDoc.exists) {
        await db.collection('gameData').doc(roomId).update(gameUpdate);
        console.log('Game data updated successfully for room:', roomId);
      } else {
        const updatedGameData = {
          roomId,
          ...gameUpdate,
          gameDuration: gameDuration,
          lastUpdateTimestamp: Date.now(),
        };
        await db.collection('gameData').doc(roomId).set(updatedGameData);
        console.log('Game data added successfully for room:', roomId);
      }
    } catch (error) {
      console.error('Error adding/updating game data:', error);
      throw error;
    }
  },

  getGameData: async (roomId) => {
    try {
      console.log('Fetching game data for room:', roomId);
      const gameDataDoc = await db.collection('gameData').doc(roomId).get();
      
      if (!gameDataDoc.exists) {
        console.log('No game data document found for room:', roomId);
        return null;
      }
      
      const gameData = gameDataDoc.data();

      return gameData;
    } catch (error) {
      console.error('Error getting game data:', error);
      throw error;
    }
  },

  periodicGameStateCheck: async (roomId) => {
    try {
      const gameData = await getGameData(roomId);
      if (gameData.gameStatus === 'active') {
        // Check for inactivity or other game rules
        const currentTime = Date.now();
        if (currentTime - gameData.lastUpdateTimestamp > 5 * 60 * 1000) { // 5 minutes of inactivity
          await updateGameData(roomId, { gameStatus: 'terminated' });
          console.log(`Game in room ${roomId} terminated due to inactivity`);
        }
      }
    } catch (error) {
      console.error('Error in periodic game state check:', error);
    }
  },
  
  // Set up periodic checks
  startPeriodicChecks: (roomId) => {
    setInterval(() => periodicGameStateCheck(roomId), 10000); // Check every 10 seconds
  },
};

module.exports = gameDataService;
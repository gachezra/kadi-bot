const { db } = require('../firebase/firebase');
const gameDataService = require('./gameDataService')

const userService = {
  createRoom: async (userId, username) => {
    try {
      const userDoc = await db.collection('users').doc(`${userId}`).get();
      
      if (!userDoc.exists) {
        // Create the user with userId as the document ID
        console.log(`User with ID ${userId} not found. Creating a new user.`);
        const newUser = {
          userId,
          username,
          createdAt: new Date()
        };
        await db.collection('users').doc(`${userId}`).set(newUser);
        console.log(`User created: ${JSON.stringify(newUser)}`);
      }
  
      // Check if the user data exists in the `userData` collection
      const userDataRef = db.collection('userData').doc(`${userId}`);
      const userDataDoc = await userDataRef.get();
  
      if (!userDataDoc.exists) {
        // Initialize user data if it doesn't exist
        const initialUserData = {
          userId,
          username,
          gamesStarted: 1,
          gamesTerminated: 0,
          totalTimePlayed: 0,
          totalCardsPlayed: 0,
          winStreak: 0,
          highestWinStreak: 0,
          lastPlayedAt: new Date()
        };
        await userDataRef.set(initialUserData);
        console.log(`Initialized user data for user: ${userId}`);
      } else {
        // Increment gamesStarted if user data already exists
        const userData = userDataDoc.data();
        await userDataRef.update({
          gamesStarted: (userData.gamesStarted || 0) + 1,
          lastPlayedAt: new Date()
        });
        console.log(`Updated room creation stats for user: ${userId}`);
      }
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  },

  updateUserGamesAndWins: async (userId) => {
    try {
      const userRef = db.collection('userData').doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        console.log(`Creating new user document for ${userId}`);
        await userRef.set({
          userId: userId,
          gamesPlayed: 0,
          gamesWon: 0,
          // Add other initial fields as needed
        });
      }

      const { gamesCount, winsCount } = await gameDataService.getUserGamesAndWins(userId);

      await userRef.update({
        gamesPlayed: gamesCount,
        gamesWon: winsCount
      });

      console.log(`Updated gamesPlayed and gamesWon for user: ${userId}`);
    } catch (error) {
      console.error('Error updating user games and wins:', error);
      throw error;
    }
  },

  updateUserStats: async (roomId, userId) => {
    try {
      const roomDoc = await db.collection('rooms').doc(roomId).get();
      const gameDataDoc = await db.collection('gameData').doc(roomId).get();

      if (!roomDoc.exists || !gameDataDoc.exists) {
        throw new Error('Room or game data not found');
      }

      const roomData = roomDoc.data();
      const gameData = gameDataDoc.data();

      const userRef = db.collection('userData').doc(`${userId}`);
      const userDoc = await userRef.get();

      let userData = userDoc.exists ? userDoc.data() : {
        userId,
        gamesStarted: 0,
        gamesWon: 0,
        gamesTerminated: 0,
        totalTimePlayed: 0,
        totalCardsPlayed: 0,
        winStreak: 0,
        gamesPlayed: 0,
        highestWinStreak: 0,
        lastPlayedAt: new Date()
      };

      // Update user statistics
      userData.gamesTerminated += gameData.isTerminated ? 1 : 0;

      // Ensure totalTimePlayed is initialized and valid
      if (typeof userData.totalTimePlayed !== 'number') {
        userData.totalTimePlayed = 0;
      }

      // Update total time played for this user
      if (typeof roomData.interMission === 'number' && roomData.interMission > 0) {
        userData.totalTimePlayed += roomData.interMission;
      }

      // Update total cards played for this specific user
      userData.totalCardsPlayed += roomData.playerCardsDropped[userId] || 0;

      console.log('Cards played by user ', userId, ': ', roomData.playerCardsDropped[userId]);
      console.log('Total cards played by user ', userId, ': ', userData.totalCardsPlayed);

      // Update win streak
      if (gameData.winner === userId) {
        userData.winStreak++;
        userData.highestWinStreak = Math.max(userData.highestWinStreak, userData.winStreak);
      } else {
        userData.winStreak = 0;
      }

      userData.lastPlayedAt = new Date();

      // Update the user document
      await userRef.set(userData, { merge: true });

      console.log(`User stats updated for user: ${userId} in room: ${roomId}`);

      // Update gamesPlayed and gamesWon
      await userService.updateUserGamesAndWins(userId);

    } catch (error) {
      console.error('Error updating user stats:', error);
      throw error;
    }
  },

  getUserStats: async (userId) => {
    try {
      const userDoc = await db.collection('userData').doc(userId).get();
      if (!userDoc.exists) {
        console.log(`No stats found for user: ${userId}`);
        return null;
      }
      return userDoc.data();
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  },

  updateStatsOnGameEnd: async (roomId) => {
    try {
      const roomDoc = await db.collection('rooms').doc(roomId).get();
      const gameDataDoc = await db.collection('gameData').doc(roomId).get();

      if (!roomDoc.exists || !gameDataDoc.exists) {
        throw new Error('Room or game data not found');
      }

      const roomData = roomDoc.data();
      const gameData = gameDataDoc.data();

      const players = roomData.playerList;
      const batch = db.batch();

      for (const player of players) {
        const userId = player.userId;
        const userRef = db.collection('userData').doc(userId);
        const userDoc = await userRef.get();

        let userData = userDoc.exists ? userDoc.data() : {
          userId,
          gamesPlayed: 0,
          gamesWon: 0,
          gamesTerminated: 0,
          totalTimePlayed: 0,
          totalCardsPlayed: 0,
          winStreak: 0,
          highestWinStreak: 0,
          lastPlayedAt: new Date()
        };

        // Update stats
        userData.gamesTerminated += gameData.isTerminated ? 1 : 0;
        userData.totalTimePlayed += roomData.interMission || 0;

        // Update win streak
        if (gameData.winner && gameData.winner.userId === userId) {
          userData.winStreak++;
          userData.highestWinStreak = Math.max(userData.highestWinStreak, userData.winStreak);
        } else {
          userData.winStreak = 0;
        }

        userData.lastPlayedAt = new Date();

        // Add the update operation to the batch
        batch.set(userRef, userData, { merge: true });
      }

      // Commit the batch
      await batch.commit();

      console.log(`All user stats updated for room: ${roomId} on game end`);

    } catch (error) {
      console.error('Error updating user stats on game end:', error);
      throw error;
    }
  },

  getRankings: async (limit = 10) => {
    try {
      const rankings = await db.collection('userData')
        .orderBy('gamesWon', 'desc')
        .limit(limit)
        .get();

      return rankings.docs.map(doc => ({
        userId: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting rankings:', error);
      throw error;
    }
  },

  getWinRate: async (userId) => {
    try {
      const userDoc = await db.collection('userData').doc(userId).get();
      if (!userDoc.exists) {
        console.log(`No stats found for user: ${userId}`);
        return null;
      }
      const userData = userDoc.data();
      const winRate = userData.gamesPlayed > 0 
        ? (userData.gamesWon / userData.gamesPlayed) * 100 
        : 0;
      return {
        userId,
        gamesStarted: userData.gamesStarted,
        gamesWon: userData.gamesWon,
        winRate: winRate.toFixed(2)
      };
    } catch (error) {
      console.error('Error calculating win rate:', error);
      throw error;
    }
  }
};

module.exports = userService;
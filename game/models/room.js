const { db } = require('../firebase/firebase');
const Deck = require('./deck');
const pokerGameLogic = require('../middleware/pokerGameLogic');
const gameDataService = require('../services/gameDataService');
const userService = require('../services/userService');

class Room {
  constructor(roomId, numPlayers, numToDeal, owner, ownerName) {
    this.roomId = roomId;
    this.numPlayers = numPlayers;
    this.numToDeal = numToDeal;
    this.owner = owner;
    this.ownerName = ownerName;
    this.playerList = [{
      userId: owner,
      username: ownerName,
      hand: [],
    }];
    this.currentPlayer = 0;
    this.gameDirection = 'forward';
    this.createdAt = new Date();
    this.lastActiveAt = new Date();
    this.topCard = null;
    this.stack = [];
    this.winner = null;
    this.isTerminated = false;
    this.roomCode = this.generateRoomCode();
    this.currentSuit = null;
    this.awaitingSpecialAction = null;
    this.specialCard = null;
    this.skipCount = 0;
    this.feedingCount = 0;
    this.playerCardsDropped = {};
    this.playerTotalCardsDropped = {};
    this.terminatedAt= null;
    this.isCard = [];
  }

  static async getUserRooms(userId) {
    console.log('Fetching rooms for user:', userId);
    const roomsSnapshot = await db.collection('rooms')
      .where('owner', '==', userId)
      .get();

    return roomsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  static async getAllRooms() {
    const roomsSnapshot = await db.collection('rooms')
      .where('isTerminated', '==', false)
      .get();
  
    const rooms = roomsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
    return rooms;
  }

  generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  static async create(numPlayers, numToDeal, owner, ownerName) {
    const roomId = generateRoomId();
    const room = new Room(roomId, numPlayers, numToDeal, owner, ownerName);

    // Initialize the deck and shuffle it
    const deck = new Deck();
    deck.shuffle();

    console.log('This is the deck: ', deck)

    // Deal cards to the owner
    const ownerHand = deck.deal(numToDeal);

    room.playerList = [{
      userId: owner,
      username: ownerName,
      hand: ownerHand
    }];

    // Utility function to extract rank from the card string
    const getRank = (card) => {
      // Rank is either the first character or first two characters for 10
      return card.length === 3 ? card.slice(0, 2) : card[0];
    };
  
    // Look for a valid top card from the shuffled deck
    let topCard;
    for (let i = 0; i < deck.cards.length; i++) {
      const potentialTopCard = deck.cards[i];
      // console.log(`Checking card: ${potentialTopCard}`);
      if (['4', '5', '6', '7'].includes(getRank(potentialTopCard))) {
        topCard = potentialTopCard;
        deck.cards.splice(i, 1);
        break;
      }
    }
  
    if (!topCard) {
      throw new Error('No valid top card found in the deck.');
    }

    // Set the top card
    room.topCard = topCard;
    room.stack = [room.topCard];

    // Serialize the room object, converting the Deck to a plain object
    const roomData = {
      ...room,
      deck: deck.toPlainObject()
    };

    await db.collection('rooms').doc(roomId).set(roomData);

    await gameDataService.initializeGameData(roomId)

    await userService.createRoom(owner);

    await Room.startChat(roomId);

    console.log('Room created:', roomId);
    return room;
  }

  static async getRoom(roomId) {
    const roomDoc = await db.collection('rooms').doc(roomId).get();
    console.log('Room ', roomId, 'document exists:', roomDoc.exists);
    
    if (roomDoc.exists) {
      if (!roomDoc.isTerminated) {
        const roomData = roomDoc.data();
        if (!roomData.playerList) {
          throw new Error('Player list not found in room data');
        }

        const clientRoomData = {...roomData};
        roomData.deckSize = roomData.deck ? roomData.deck.cards.length : 0;
        clientRoomData.deckSize = roomData.deckSize;
        delete clientRoomData.deck;
        
        return {fullRoom: roomData, clientRoom: clientRoomData};
      } else {
        return {
          isTerminated: true,
          winnerMessage: roomData.winnerMessage || 'The room is terminated.'
        };
      }
    }
    
    console.error('Room not found for ID:', roomId); // Log an error if the room is not found
  }

  static async joinRoom(roomId, player, roomCode) {
    const roomDoc = await db.collection('rooms').doc(roomId).get();
    if (roomDoc.exists) {
      const roomData = roomDoc.data();
      const room = new Room(
        roomData.roomId,
        roomData.numPlayers,
        roomData.numToDeal,
        roomData.owner,
        roomData.ownerName
      );
      Object.assign(room, roomData);

      // Reconstruct the Deck object
      room.deck = Deck.fromPlainObject(roomData.deck);

      // Check if the player is already in the room
      const existingPlayer = room.playerList.find(p => p.userId === player.userId);
      if (existingPlayer) {
        return room; // Player is already in the room, return the room
      }

      // Check if the room is full
      if (room.playerList.length >= room.numPlayers) {
        throw new Error('Room is full');
      }

      // Check if the player is the owner or has the correct room code
      if (player.userId !== room.owner && room.roomCode !== roomCode) {
        throw new Error('Invalid room code');
      }

      // Deal cards to the new player
      const playerHand = room.deck.deal(room.numToDeal);
      player.hand = playerHand;

      room.playerList.push(player);
      await db.collection('rooms').doc(roomId).update({
        playerList: room.playerList,
        deck: room.deck.toPlainObject()
      });

      return room;
    } else {
      throw new Error('Room not found');
    }
  }

  static async startGame(roomId) {
    const roomDoc = await db.collection('rooms').doc(roomId).get();
    if (roomDoc.exists) {
      const room = roomDoc.data();
      room.startTerminationTimer();
      await db.collection('rooms').doc(roomId).set(room);
      return room;
    }
    throw new Error('Room not found'); 
  }

  static async makeMove(roomId, userId, action, cards = []) {
    console.log(`Making move for room ${roomId}, user ${userId}, action ${action}, cards ${JSON.stringify(cards)}`);
    
    const roomData = await this.getRoom(roomId);
    if (!roomData) throw new Error('Room not found');
    
    const room = roomData.fullRoom;
    // console.log('Initial room state:', JSON.stringify(room, null, 2));

    if (room.isTerminated) throw new Error('Room terminated!');

    if (action === 'pick') {
      room.awaitingSpecialAction = false;
    }

    try {
      if (action === 'drop') {
        pokerGameLogic.validateMove(room, cards);  // Validate first
      }
      
      const updatedRoom = pokerGameLogic.processMove(room, userId, action, cards);
      // console.log('Updated room state:', JSON.stringify(updatedRoom, null, 2));

      // Check if the game has ended (winner announced)
      if (updatedRoom.winner) {
        // Update the room with the winner
        updatedRoom.isTerminated = true;
        updatedRoom.winnerMessage = `Player ${updatedRoom.winner.username} has won the game!`;
      }

      if (updatedRoom.shouldTerminate) {
        await this.terminateRoom(roomId, userId);
      }

      if (updatedRoom.deck instanceof Deck) {
        updatedRoom.deck = updatedRoom.deck.toPlainObject();
      }

      await this.updateRoom(userId, roomId, updatedRoom);
      console.log('Room updated in database');

      // Update user stats for all players after each move
      await userService.updateUserStats(roomId, userId);

      const updatedClientRoom = {...updatedRoom};
      
      delete updatedClientRoom.deck;

      return updatedClientRoom;
    } catch (error) {
      console.error('Error processing move:', error);
      // In case of an error, still try to update user stats
      await userService.updateUserStats(roomId, userId);
      throw error;
    }
  }

  static async playerIsCard(roomId, userId) {
    try {
      const roomData = await this.getRoom(roomId);
      if (!roomData) throw new Error('Room not found');
  
      const room = roomData.fullRoom;
  
      // Toggle the presence of userId in the isCard array
      if (!room.isCard.includes(userId)) {
        room.isCard.push(userId);
      } else {
        room.isCard = room.isCard.filter(id => id !== userId);
      }

      room.intermission = 0;
  
      await this.updateRoom(userId, roomId, room);
  
      return room;
    } catch (error) {
      console.error(`Error toggling user in isCard array: ${error.message}`);
      throw error;
    }
  }

  static async answerQuestion(roomId, userId, action, cards = []) {
    const roomData = await this.getRoom(roomId);
    if (!roomData) throw new Error('Room not found');
    
    const room = roomData.fullRoom;

    if (!room.playerList) throw new Error('Player list not found in room');

    const currentPlayerIndex = room.playerList.findIndex(p => p.userId === userId);
    if (room.currentPlayer !== currentPlayerIndex) {
      throw new Error('Not your turn');
    }
    
    if (!room.awaitingSpecialAction || !['8', 'Q'].includes(room.specialCard.charAt(0))) {
      throw new Error('No question to answer');
    }

    const updatedRoom = pokerGameLogic.processMove(room, userId, action, cards);
    
    await this.updateRoom(userId, roomId, updatedRoom);
    
    return room;
  }

  static async changeSuit(roomId, userId, newSuit) {
    const roomData = await this.getRoom(roomId);
    if (!roomData) throw new Error('Room not found');
    
    const room = roomData.fullRoom;
    
    if (room.currentPlayer !== room.playerList.findIndex(p => p.userId === userId)) {
      throw new Error('Not your turn');
    }
  
    if (!room.awaitingSpecialAction || room.specialCard.charAt(0) !== 'A' || room.feedingCount > 0) {
      throw new Error('Cannot change suit at this time');
    }

    if (!newSuit) {
      throw new Error('New suit must be provided');
    }
    
    room.currentSuit = newSuit;
    room.topCard = newSuit; // Only keep the suit
    room.awaitingSpecialAction = false;
    room.specialCard = null;

    pokerGameLogic.moveToNextPlayer(room);
    
    const updatedClientRoom = {...room};

    await this.updateRoom(userId, roomId, updatedClientRoom);

    delete updatedClientRoom.deck;
    
    return updatedClientRoom;
  }

  static async dropAce(roomId, userId, drop = true) {
    const roomData = await this.getRoom(roomId);
    if (!roomData) throw new Error('Room not found');
    
    const room = roomData.fullRoom;

    if (room.currentPlayer !== room.playerList.findIndex(p => p.userId === userId)) {
      throw new Error('Not your turn');
    }

    if (!room.awaitingSpecialAction || room.specialCard.charAt(0) !== 'A' || room.feedingCount === 0) {
      throw new Error('Cannot drop Ace at this time');
    }

    if (drop) {
      room.awaitingSpecialAction = false;
      room.specialCard = null;
      room.feedingCount = 0;
    } else {
      //next time make it stack.card.-1 type shi
      room.currentSuit = null;
    }

    const updatedRoom = pokerGameLogic.moveToNextPlayer(room);

    await this.updateRoom(userId, roomId, updatedRoom);
    
    const updatedClientRoom = {...room};
    delete updatedClientRoom.deck;

    return updatedClientRoom;
  }

  static async terminateRoom(roomId, userId) {
    const roomRef = db.collection('rooms').doc(roomId);
    const roomDoc = await roomRef.get();
    const roomData = roomDoc.data();
  
    const terminatedAt = new Date();
    const createdAt = roomData.createdAt.toDate()
    const gameDuration = terminatedAt - createdAt;

    console.log(gameDuration)
    
    await roomRef.update({
      isTerminated: true,
      terminatedAt: terminatedAt
    });

    const gameRef = db.collection('gameData').doc(roomId);
    
    await gameRef.update({
      isTerminated: true,
      terminatedAt: terminatedAt,
      gameDuration: gameDuration
    });

    const userRef = db.collection('userData').doc(userId);

    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      throw new Error('User data not found');
    }
    
    const userData = userDoc.data();
    
    // Initialize gamesStarted if it doesn't exist
    const currentGamesTerminated = userData.gamesTerminated || 0;

    await userRef.update({
      gamesTerminated: currentGamesTerminated + 1,
    })

    // Update all player stats
    await userService.updateStatsOnGameEnd(roomId);
  };

  static async updateRoom(userId, roomId, updatedRoom) {
    //  // Filter out undefined values
    // const filteredRoom = Object.entries(updatedRoom).reduce((acc, [key, value]) => {
    //   if (value !== undefined) {
    //     acc[key] = value;
    //   }
    //   return acc;
    // }, {});

    // // Ensure winner is not undefined
    // if (filteredRoom.winner === undefined) {
    //   delete filteredRoom.winner;
    // }
    console.log(roomId, updatedRoom)
    await db.collection('rooms').doc(roomId).update(updatedRoom, { ignoreUndefinedProperties: true });
    await gameDataService.updateGameData(roomId, updatedRoom)
  }

  static async startChat(roomId) {
    const roomRef = db.collection('rooms').doc(roomId);
    await roomRef.update({
      chatActive: true
    });
    console.log(`Chat started for room ${roomId}`);
  }
  
  static async stopChat(roomId) {
    const roomRef = db.collection('rooms').doc(roomId);
    await roomRef.update({
      chatActive: false
    });
    console.log(`Chat stopped for room ${roomId}`);
  }
}

function generateRoomId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

module.exports = Room;
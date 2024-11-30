const Deck = require('../models/deck');

const pokerGameLogic = {
  getRank(card) {
    return card.slice(0, -1);
  },

  getSuit(card) {
    return card.slice(-1);
  },

  isValidCard(rank, suit) {
    const validRanks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const validSuits = ['♥', '♦', '♣', '♠'];
    return validRanks.includes(rank) && validSuits.includes(suit);
  },

  isValidAnswer(specialCard, answerCard) {
    const specialRank = this.getRank(specialCard);
    const specialSuit = this.getSuit(specialCard);
    const answerRank = this.getRank(answerCard);
    const answerSuit = this.getSuit(answerCard);

    if (!this.isValidCard(answerRank, answerSuit)) {
      return false;
    }

    if (specialRank === '8') {
      return answerSuit === specialSuit;
    }

    if (specialRank === 'Q') {
      return answerRank === specialRank;
    }

    return false;
  },

  isFeedingCard(rank) {
    return rank === '2' || rank === '3';
  },

  isSpecialCard(rank) {
    return ['2', '3', 'A', 'K', 'J', 'Q', '8'].includes(rank);
  },

  isQuestionCard(rank) {
    return rank === '8' || rank === 'Q';
  },

  validateMove(room, cards) {

    console.log('Validating move:', {
      topCard: room.stack[room.stack.length - 1] || room.topCard,
      playedCards: cards
    });
    if (cards.length < 1) {
      throw new Error('Invalid move: At least one card must be played.');
    }

    const topCard = room.stack[room.stack.length - 1] || room.topCard;
    let currentTopCard = topCard;

    // Check if we're awaiting a special action
    if (room.awaitingSpecialAction) {
      const specialCardRank = this.getRank(room.specialCard);
      if (specialCardRank === '8' || specialCardRank === 'Q') {
        // For '8' or 'Q', any card of the same suit is valid
        if (this.getSuit(cards[0]) !== this.getSuit(room.specialCard)) {
          throw new Error(`Invalid move: Must play a card of ${this.getSuit(room.specialCard)} suit to answer the question card.`);
        }
        return; // Exit early as this is a valid move
      }
    }

    // Check if we're awaiting a rank (after an Ace was played)
    const awaitingRank = room.currentSuit && !this.getRank(topCard);

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const cardRank = this.getRank(card);
      const cardSuit = this.getSuit(card);
      let awaitingAnswer = false;

      // Aces can always be played
      if (cardRank === 'A') {
        // Allow the sequence to end here, suit change will be handled in processMove
        if (i < cards.length - 1) {
          throw new Error('Invalid move: Ace must be the last card played in a sequence.');
        }
        continue; // Skip further checks for this card
      }

      if (cardRank === 'J') {
        room.skipCount += 1;
      }

      if (cardRank === '8' || cardRank === 'Q') {
        awaitingAnswer = true;
      }

      // If we're awaiting a rank, any card of the correct suit is valid
      if (awaitingRank && i === 0) {
        if (cardSuit !== room.currentSuit) {
          throw new Error(`Invalid move: First card must match the chosen suit ${room.currentSuit}.`);
        }
      } 
      // For normal plays, check rank and suit match
      else if (!awaitingRank && i === 0) {
        const topRank = this.getRank(currentTopCard);
        const topSuit = this.getSuit(currentTopCard);
        
        if (cardRank !== topRank && cardSuit !== topSuit && cardSuit !== room.currentSuit) {
          throw new Error('Invalid move: First card does not match the top card or current suit.');
        }
      } 
      // For subsequent cards in the sequence
      else if (awaitingAnswer && i > 0) {
        const prevCard = cards[i - 1];
        const prevRank = this.getRank(prevCard);
        const prevSuit = this.getSuit(prevCard);

        if (cardRank !== prevRank && cardSuit !== prevSuit) {
          throw new Error(`Invalid move: ${card} does not match ${prevCard}`);
        }
      } else if (!awaitingAnswer && i > 0) {
        const prevCard = cards[i - 1];
        const prevRank = this.getRank(prevCard);
        const prevSuit = this.getSuit(prevCard);

        if (prevRank === '8' || prevRank === 'Q') {
          if (cardSuit !== prevSuit) {
            throw new Error(`Invalid move: ${card} does not match ${prevCard}`);
          }
        } else if (cardRank !== prevRank) {
          throw new Error(`Invalid move: ${card} does not match ${prevCard}`);
        }
      }

      // Update currentTopCard for the next iteration
      currentTopCard = card;

      // Handle question cards
      if (this.isQuestionCard(cardRank)) {
        // Allow the sequence to continue, the answer will be handled in processMove
      }
    }

    // Check if there is a feeding count
    if (room.feedingCount > 0) {
      const feedingCards = cards.filter(card => this.isFeedingCard(this.getRank(card)));
      const hasAce = cards.some(card => this.getRank(card) === 'A');
      if (feedingCards.length === 0 && !hasAce) {
        throw new Error('Invalid move: Must play a feeding card, an Ace, or pick up.');
      }
    }
  },

  processMove(room, userId, action, cards = []) {
    const playerIndex = room.playerList.findIndex(p => p.userId === userId);
    if (playerIndex === -1) throw new Error('Player not found');
    if (playerIndex !== room.currentPlayer) throw new Error('Not your turn');
  
    const player = room.playerList[playerIndex];
  
    let updatedRoom = { ...room };
  
    if (action === 'pick') {
      if (
        !updatedRoom.deck ||
        !updatedRoom.deck.cards ||
        updatedRoom.deck.cards.length === 0
        ||
        updatedRoom.deck.cards.length <= updatedRoom.feedingCount
      ) {
        this.reshuffleDeck(updatedRoom);
      }
      const cardsToPick = updatedRoom.feedingCount > 0 ? updatedRoom.feedingCount : 1;
      for (let i = 0; i < cardsToPick; i++) {
        const pickedCard = updatedRoom.deck.cards.pop();
        player.hand.push(pickedCard);
      }
      updatedRoom.feedingCount = 0;
      updatedRoom.pickedCard = player.hand[player.hand.length - 1];
      updatedRoom.playerCardsDropped[userId] = 0;
      this.moveToNextPlayer(updatedRoom);
    } else if (action === 'drop') {
      // this.validateMove(updatedRoom, cards);
      player.hand = player.hand.filter(card => !cards.includes(card));
      updatedRoom.stack.push(...cards);
      updatedRoom.topCard = cards[cards.length - 1];

      // Update the cards dropped for this specific player
      if (!updatedRoom.playerTotalCardsDropped[userId]) {
        updatedRoom.playerTotalCardsDropped[userId] = 0;
      }
      updatedRoom.playerCardsDropped[userId] = cards.length;
      updatedRoom.playerTotalCardsDropped[userId] += cards.length;
      
      const lastPlayedCard = updatedRoom.topCard;
      const lastPlayedRank = this.getRank(lastPlayedCard);

      if (this.isFeedingCard(lastPlayedRank)) {
        updatedRoom.feedingCount += parseInt(lastPlayedRank);
      }
      
      if (lastPlayedRank === 'A') {
        if (updatedRoom.feedingCount > 0) {
          updatedRoom.feedingCount = 0;
          updatedRoom.awaitingSpecialAction = false;
          updatedRoom.specialCard = null;
          this.moveToNextPlayer(updatedRoom);
        } else {
          updatedRoom.awaitingSpecialAction = true;
          updatedRoom.specialCard = lastPlayedCard;
        }
      } else if (this.isQuestionCard(lastPlayedRank)) {
        updatedRoom.awaitingSpecialAction = true;
        updatedRoom.specialCard = lastPlayedCard;
        // Don't move to next player yet, wait for answer
      } else {
        updatedRoom.awaitingSpecialAction = false;
        updatedRoom.specialCard = null;
        this.handleSpecialCard(updatedRoom, lastPlayedCard);
        this.moveToNextPlayer(updatedRoom);
      }
    } else {
      throw new Error('Invalid move action');
    }

    const intermission = new Date() - updatedRoom.lastActiveAt.toDate();
    
    // if (intermission > 60000) {
    //   updatedRoom.awaitingSpecialAction = false;
    //   updatedRoom.specialCard = null;
    //   this.moveToNextPlayer(updatedRoom);
    // }

    updatedRoom.interMission = intermission;
    updatedRoom.lastActiveAt = new Date();
    updatedRoom.deckSize = updatedRoom.deck.cards.length;

    //plot to prolong the game
    const winner = this.determineWinner(room);
    if (winner && updatedRoom.isCard.includes(userId)) {
      const playersWithAces = room.playerList.filter(player => 
        player.userId !== winner.userId && 
        player.hand.some(card => this.getRank(card) === 'A')
      );

      if (playersWithAces.length >= 2) {
        updatedRoom.potentialWinner = winner.userId;
        updatedRoom.playersWithAces = playersWithAces.map(player => player.userId);
        updatedRoom.awaitingAceDrops = true;
        updatedRoom.acesDropped = [];
        // Don't change the top card or current player
      } else {
        updatedRoom.winner = winner.winner;
        updatedRoom.shouldTerminate = true;
        console.log('Winner Id: ', updatedRoom.winner)
      }
    }
    
    updatedRoom.isCard = updatedRoom.isCard.filter(id => id !== userId);

    return updatedRoom;
  },

  handleSpecialCard(room, card) {
    const rank = this.getRank(card);

    switch (rank) {
      // case '2':
      // case '3':
      //   room.feedingCount += parseInt(rank);
      //   break;
      case 'J':
        room.skipCount += 1;
        break;
      case 'K':
        room.gameDirection = room.gameDirection === 'forward' ? 'backward' : 'forward';
        break;
      case '8':
      case 'Q':
        // These are handled in validateMove and processMove, no additional action needed here
        break;
    }
  },

  moveToNextPlayer(room) {
    do {
      room.currentPlayer = (room.currentPlayer + (room.gameDirection === 'forward' ? 1 : -1) + room.numPlayers) % room.numPlayers;
      room.skipCount = Math.max(0, room.skipCount - 1);
    } while (room.skipCount > 0);
  },

  determineWinner(room) {
    if (!room || !room.playerList) {
      console.error('Invalid room object passed to determineWinner');
      return null;
    }

    const currentPlayerIndex = room.currentPlayer;
    if (currentPlayerIndex === undefined || currentPlayerIndex < 0 || currentPlayerIndex >= room.playerList.length) {
      console.error('Invalid currentPlayer index:', currentPlayerIndex);
      return null;
    }

    const otherPlayers = room.playerList.filter((player, index) => index !== currentPlayerIndex && player && player.userId);
    const hasAtLeastOneCard = otherPlayers.every((player) => player.hand && player.hand.length >= 1);

    const currentPlayer = room.playerList[currentPlayerIndex];
    if (!currentPlayer) {
      console.error('Current player not found');
      return null;
    }

    const playerHasDepletedHand = currentPlayer.hand && currentPlayer.hand.length === 0;
    const finalCard = room.stack && room.stack.length > 0 ? room.stack[room.stack.length - 1] : null;
    const finalRank = finalCard ? this.getRank(finalCard) : null;

    if (hasAtLeastOneCard && playerHasDepletedHand && finalRank && finalRank >= '4' && finalRank <= '7') {
      return {
        winner: {
          userId: currentPlayer.userId,
          username: currentPlayer.username,
        },
        message: `Game Over! ${currentPlayer.username} is the winner!`,
      };
    } else {
      return null; // Game is not won
    }
  },

  reshuffleDeck(room) {
    console.log('Reshuffling deck');
    const topCard = room.stack.pop();
    const newDeck = new Deck();
    newDeck.cards = [...room.stack];
    newDeck.shuffle();

    // Add remaining cards from the original deck to the new deck
    if (room.deck && room.deck.cards) {
      newDeck.cards.push(...room.deck.cards);
    }

    room.deck = newDeck.toPlainObject(); // Convert to plain object
    room.stack = [topCard];
    console.log('New deck size:', room.deck.cards.length);
    console.log('Stack size:', room.stack.length);
  },
};

module.exports = pokerGameLogic;
const { Markup } = require('telegraf');
const Room = require('../game/models/room');
const { cardUrls } = require('../utils/cardUtils');

const selectedCards = new Map();
const userRoomMap = new Map();

function createCardSelectionMarkup(hand, userId) {
  const userSelected = selectedCards.get(userId) || [];
  
  const cardButtons = hand.map(card => ({
    text: `${card} ${userSelected.includes(card) ? '✅' : ''}`,
    callback_data: `select_card_${card}`
  }));

  const cardRows = [];
  for (let i = 0; i < cardButtons.length; i += 4) {
    cardRows.push(cardButtons.slice(i, i + 4));
  }

  const controlButtons = [
    [{ text: '🔄 Clear Selection', callback_data: 'clear_selection' }],
    [
      { text: '🎴 Pick', callback_data: 'pick_card' },
      { text: '⬇️ Drop Selected', callback_data: 'drop_cards' }
    ]
  ];

  return Markup.inlineKeyboard([
    ...cardRows,
    ...controlButtons
  ]);
}

async function displayPlayerInterface(ctx, roomId, userId) {
  try {
    const room = await Room.getRoom(roomId);
    const player = room.clientRoom.playerList.find(p => p.userId === userId);

    if (!player) {
      return;
    }

    // Store user-room relationship
    userRoomMap.set(userId, roomId);

    // Send private message to player
    try {
      await ctx.telegram.sendPhoto(
        userId,
        { url: cardUrls[room.clientRoom.topCard] },
        { caption: 'Top Card' }
      );
      await ctx.telegram.sendMessage(
        userId,
        `*Your Cards*\n` +
        `Select cards in order to play them:`,
        {
          parse_mode: 'Markdown',
          ...createCardSelectionMarkup(player.hand, userId)
        }
      );
    } catch (error) {
      // Handle case where bot can't message user
      await ctx.reply(
        `@${player.username}, I cannot send you private messages. Please start a private chat with me first 👉🏽 @nikokadibot`
      );
    }

  } catch (error) {
    console.error('Error displaying player interface:', error);
  }
}

async function handleCardSelection(ctx) {
  try {
    const userId = ctx.from.id;
    const card = ctx.callbackQuery.data.split('_')[2];
    
    let userSelected = selectedCards.get(userId) || [];
    
    if (userSelected.includes(card)) {
      userSelected = userSelected.filter(c => c !== card);
    } else {
      userSelected.push(card);
    }
    
    selectedCards.set(userId, userSelected);

    const roomId = userRoomMap.get(userId);
    if (!roomId) {
      throw new Error('Room ID not found for user');
    }

    await displayPlayerInterface(ctx, roomId, userId);
    await ctx.answerCbQuery(`Card ${card} ${userSelected.includes(card) ? 'selected' : 'unselected'}`);

  } catch (error) {
    console.error('Error handling card selection:', error);
    await ctx.answerCbQuery('Error selecting card');
  }
}

async function handleClearSelection(ctx) {
  try {
    const userId = ctx.from.id;
    selectedCards.delete(userId);

    const roomId = userRoomMap.get(userId);
    if (!roomId) {
      throw new Error('Room ID not found for user');
    }

    await displayPlayerInterface(ctx, roomId, userId);
    await ctx.answerCbQuery('Selection cleared');

  } catch (error) {
    console.error('Error clearing selection:', error);
    await ctx.answerCbQuery('Error clearing selection');
  }
}

async function handlePickCard(ctx) {
  try {
    const userId = ctx.from.id;
    const roomId = userRoomMap.get(userId);
    let action = 'pick';
    await ctx.answerCbQuery('Picked a card');
    await Room.makeMove(roomId, userId, action)

  } catch (error) {
    console.error('Error picking card:', error);
    await ctx.answerCbQuery('Error picking card');
  }
}

async function handleDropCards(ctx) {
  try {
    const userId = ctx.from.id;
    const userSelected = selectedCards.get(userId) || [];
    const roomId = userRoomMap.get(userId);
    let action = 'drop';
    
    if (userSelected.length === 0) {
      return await ctx.answerCbQuery('No cards selected!');
    }

    // Add drop cards logic here
    selectedCards.delete(userId);
    await ctx.answerCbQuery(`Dropped ${userSelected.length} cards`);

    await Room.makeMove(roomId, userId, action, userSelected);

    await this.displayPlayerInterface(ctx, roomId, userId);

  } catch (error) {
    console.error('Error dropping cards:', error);
    await ctx.answerCbQuery('Error dropping cards');
  }
}

module.exports = {
  displayPlayerInterface,
  handleCardSelection,
  handleClearSelection,
  handlePickCard,
  handleDropCards
};
const { Markup } = require('telegraf');
const Room = require('../game/models/room');
const { cardUrls } = require('../utils/cardUtils');
const Redis = require('ioredis');
const redis = new Redis(`${process.env.REDIS}`);

// Redis helper functions
async function setSelectedCards(userId, cards) {
  await redis.set(`user:${userId}:selected_cards`, JSON.stringify(cards));
  // Set TTL for 1 hour to prevent stale data
  await redis.expire(`user:${userId}:selected_cards`, 3600);
}

async function getSelectedCards(userId) {
  const cards = await redis.get(`user:${userId}:selected_cards`);
  return cards ? JSON.parse(cards) : [];
}

async function clearSelectedCards(userId) {
  await redis.del(`user:${userId}:selected_cards`);
}

async function setUserRoom(userId, roomId) {
  await redis.set(`user:${userId}:current_room`, roomId);
  // Set TTL for 4 hours
  await redis.expire(`user:${userId}:current_room`, 14400);
}

async function getUserRoom(userId) {
  return await redis.get(`user:${userId}:current_room`);
}

async function createCardSelectionMarkup(hand, userId) {
  const userSelected = await getSelectedCards(userId);
  
  const cardButtons = hand.map(card => ({
    text: `${card} ${userSelected.includes(card) ? '✅' : ''}`,
    callback_data: `select_card_${card}`
  }));

  const cardRows = [];
  for (let i = 0; i < cardButtons.length; i += 4) {
    cardRows.push(cardButtons.slice(i, i + 4));
  }

  const miniAppButton = [{
    text: '🎧 Start Audio',
    web_app: { url: 'https://kadi.pexmon.one' }
  }];

  const controlButtons = [
    [{ text: '🔄 Clear Selection', callback_data: 'clear_selection' }],
    [
      { text: '🎴 Pick', callback_data: 'pick_card' },
      { text: '⬇️ Drop Selected', callback_data: 'drop_cards' }
    ],
    miniAppButton
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

    await setUserRoom(userId, roomId);

    await ctx.telegram.sendMessage(
      userId,
      `*Your Cards*\n` +
      `Select cards in order to play them:`,
      {
        parse_mode: 'Markdown',
        ...await createCardSelectionMarkup(player.hand, userId)
      }
    );

  } catch (error) {
    console.error('Error displaying player interface:', error);
  }
}

async function handleCardSelection(ctx) {
  try {
    const userId = ctx.from.id;
    const card = ctx.callbackQuery.data.split('_')[2];
    
    let userSelected = await getSelectedCards(userId);
    
    if (userSelected.includes(card)) {
      userSelected = userSelected.filter(c => c !== card);
    } else {
      userSelected.push(card);
    }
    
    await setSelectedCards(userId, userSelected);
    const roomId = await getUserRoom(userId);
    const room = await Room.getRoom(roomId);

    await ctx.editMessageReplyMarkup(
      (await createCardSelectionMarkup(
        room.clientRoom.playerList.find(p => p.userId === userId).hand,
        userId
      )).reply_markup
    );

    await ctx.answerCbQuery();

  } catch (error) {
    console.error('Error handling card selection:', error);
    await ctx.answerCbQuery('Error selecting card');
  }
}

async function handleClearSelection(ctx) {
  try {
    const userId = ctx.from.id;
    await clearSelectedCards(userId);
    const roomId = await getUserRoom(userId);
    const room = await Room.getRoom(roomId);

    await ctx.editMessageReplyMarkup(
      (await createCardSelectionMarkup(
        room.clientRoom.playerList.find(p => p.userId === userId).hand,
        userId
      )).reply_markup
    );

    await ctx.answerCbQuery('Selection cleared');

  } catch (error) {
    console.error('Error clearing selection:', error);
    await ctx.answerCbQuery('Error clearing selection');
  }
}

async function handlePickCard(ctx) {
  try {
    const userId = ctx.from.id;
    const roomId = await getUserRoom(userId);
    let action = 'pick';
    
    await ctx.answerCbQuery('Picked a card');
    await Room.makeMove(roomId, userId, action);

    const room = await Room.getRoom(roomId);
    const roomHandler = require('./roomHandler');
    await roomHandler.handleRoomDisplay(ctx, roomId);

  } catch (error) {
    console.error('Error picking card:', error);
    await ctx.answerCbQuery('Error picking card');
  }
}

async function handleDropCards(ctx) {
  try {
    const userId = ctx.from.id;
    const userSelected = await getSelectedCards(userId);
    const roomId = await getUserRoom(userId);
    let action = 'drop';
    
    if (userSelected.length === 0) {
      return await ctx.answerCbQuery('No cards selected!');
    }

    await clearSelectedCards(userId);
    await Room.makeMove(roomId, userId, action, userSelected);

    const roomHandler = require('./roomHandler');
    await roomHandler.handleRoomDisplay(ctx, roomId);

    await ctx.answerCbQuery(`Dropped ${userSelected.length} cards`);

  } catch (error) {
    console.error('Error dropping cards:', error);
    await ctx.answerCbQuery(error.toString());
  }
}

module.exports = {
  displayPlayerInterface,
  handleCardSelection,
  handleClearSelection,
  handlePickCard,
  handleDropCards
};
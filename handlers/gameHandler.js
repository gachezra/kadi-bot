const { Markup } = require('telegraf');
const Room = require('../game/models/room');
const { cardUrls } = require('../utils/cardUtils');

// Helper function to check if message is from a group
function isGroup(ctx) {
  return ctx.chat?.type === 'group' || ctx.chat?.type === 'supergroup';
}

// Helper function to create player count buttons
function createPlayerCountMarkup(currentCount = 2) {
  return Markup.inlineKeyboard([
    [
      { text: '➖', callback_data: 'decrease_players' },
      { text: `${currentCount} Players`, callback_data: 'player_count' },
      { text: '➕', callback_data: 'increase_players' }
    ],
    [{ text: '🎮 Start Game', callback_data: 'start_game' }]
  ]);
}

async function handleGameStart(ctx) {
  try {
    if (!isGroup(ctx)) {
      return await ctx.reply(
        '⚠️ This command can only be used in groups. Please add me to a group first!'
      );
    }

    await ctx.reply(
      `*🎮 NikoKadi Game Setup*\n\n` +
      `Welcome to NikoKadi! Here's how to play:\n\n` +
      `1️⃣ Select the number of players (2-6)\n` +
      `2️⃣ Click "Start Game" when ready\n` +
      `3️⃣ Players must start a private chat with me (click my username) before joining\n` +
      `4️⃣ Each player will receive their cards in private message\n\n` +
      `Important: Make sure you've started a chat with me before joining!\n\n` +
      `Select number of players:`,
      {
        parse_mode: 'Markdown',
        ...createPlayerCountMarkup()
      }
    );
  } catch (error) {
    console.error('Error in game start handler:', error);
    await ctx.reply('Sorry, there was an error starting the game. Please try again.');
  }
}

async function handleDecreasePlayer(ctx) {
  try {
    const currentText = ctx.callbackQuery.message.reply_markup.inline_keyboard[0][1].text;
    const currentCount = parseInt(currentText.split(' ')[0]);
    
    if (currentCount <= 2) {
      return await ctx.answerCbQuery('Minimum 2 players required!');
    }

    await ctx.editMessageReplyMarkup(
      createPlayerCountMarkup(currentCount - 1).reply_markup
    );
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Error in decrease player handler:', error);
    await ctx.answerCbQuery('Error updating player count');
  }
}

async function handleIncreasePlayer(ctx) {
  try {
    const currentText = ctx.callbackQuery.message.reply_markup.inline_keyboard[0][1].text;
    const currentCount = parseInt(currentText.split(' ')[0]);
    
    if (currentCount >= 6) {
      return await ctx.answerCbQuery('Maximum 6 players allowed!');
    }

    await ctx.editMessageReplyMarkup(
      createPlayerCountMarkup(currentCount + 1).reply_markup
    );
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Error in increase player handler:', error);
    await ctx.answerCbQuery('Error updating player count');
  }
}

async function handleGameBegin(ctx) {
  try {
    console.log('Game begin handler triggered');
    const currentText = ctx.callbackQuery.message.reply_markup.inline_keyboard[0][1].text;
    const numPlayers = parseInt(currentText.split(' ')[0]);
    console.log('Creating room with players:', numPlayers);

    const owner = ctx.callbackQuery.from.id;
    const ownerName = ctx.callbackQuery.from.username || 
      `${ctx.callbackQuery.from.first_name}${ctx.callbackQuery.from.last_name ? ' ' + ctx.callbackQuery.from.last_name : ''}`;

    const numToDeal = 7;

    try {
      const room = await Room.create(Number(numPlayers), Number(numToDeal), owner, ownerName);
      
      // Use the room handler to display initial game state
      const roomHandler = require('./roomHandler');
      await roomHandler.handleRoomDisplay(ctx, room.roomId);
      
    } catch (roomError) {
      console.error('Error creating room:', roomError);
      await ctx.editMessageText(
        '❌ Failed to create game room. Please try again.',
        { parse_mode: 'Markdown' }
      );
    }

    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Error in game begin handler:', error);
    await ctx.answerCbQuery('Error starting the game');
  }
}

module.exports = {
  handleGameStart,
  handleDecreasePlayer,
  handleIncreasePlayer,
  handleGameBegin,
  isGroup
};
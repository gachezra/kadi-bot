const { Markup } = require('telegraf');
const Room = require('../game/models/room');
const { cardUrls } = require('../utils/cardUtils');

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
    const gameSetupMsg = 
      `*🎮 NikoKadi Game Setup*\n\n` +
      `Welcome to NikoKadi! Here's how to play:\n\n` +
      `1️⃣ Select the number of players (2-6)\n` +
      `2️⃣ Click "Start Game" when ready\n` +
      `3️⃣ Share your game invite link with other players\n` +
      `4️⃣ Wait for players to join\n\n` +
      `Select number of players:`;

    await ctx.reply(gameSetupMsg, {
      parse_mode: 'Markdown',
      ...createPlayerCountMarkup()
    });
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
    const currentText = ctx.callbackQuery.message.reply_markup.inline_keyboard[0][1].text;
    const numPlayers = parseInt(currentText.split(' ')[0]);

    const owner = ctx.callbackQuery.from.id;
    const ownerName = ctx.callbackQuery.from.username || 
      `${ctx.callbackQuery.from.first_name}${ctx.callbackQuery.from.last_name ? ' ' + ctx.callbackQuery.from.last_name : ''}`;

    const numToDeal = 7;

    try {
      const room = await Room.create(Number(numPlayers), Number(numToDeal), owner, ownerName);
      
      // Generate invite link
      const inviteLink = `https://t.me/nikokadibot?start=join_${room.roomId}`.replace(/_/g, '\\_');;
      
      await ctx.editMessageText(
        `*🎮 Game Room Created!*\n\n` +
        `Share this link with other players to join:\n` +
        `${inviteLink}\n\n` +
        `Waiting for players (1/${numPlayers})...`,
        { 
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        }
      );

      // Display initial game state to owner
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
  handleGameBegin
};
const { Markup } = require('telegraf');
const Room = require('../game/models/room');
const { cardUrls } = require('../utils/cardUtils');

function createGameStatusMarkup(room) {
  if (!room || !room.clientRoom || !room.clientRoom.playerList) {
    console.error('Invalid room data:', room);
    return Markup.inlineKeyboard([[
      { text: '❌ Error Loading Game Status', callback_data: 'status_display' }
    ]]);
  }

  const playersList = room.clientRoom.playerList.map((player, index) => ({
    text: `${player.username}${player.userId === room.clientRoom.currentPlayer ? ' 🎮' : ''}`,
    callback_data: 'status_display'
  }));

  const playerRows = [];
  for (let i = 0; i < playersList.length; i += 2) {
    playerRows.push(playersList.slice(i, i + 2));
  }

  const gameInfoRow = [{
    text: `Cards in Deck: ${room.clientRoom.stack?.length || '?'} | Direction: ${room.clientRoom.isClockwise ? '➡️' : '⬅️'}`,
    callback_data: 'status_display'
  }];

  const maxPlayers = room.clientRoom.maxPlayers || 6;
  const currentPlayers = room.clientRoom.playerList.length;
  
  const joinRow = currentPlayers < maxPlayers ? [
    [{
      text: `🎮 Join Game (${currentPlayers}/${maxPlayers})`,
      callback_data: `join_game_${room.clientRoom.roomId}`
    }]
  ] : [];

  return Markup.inlineKeyboard([
    ...playerRows,
    gameInfoRow,
    ...joinRow
  ]);
}

async function handleRoomDisplay(ctx, roomId) {
  try {
    console.log('Room display handler triggered for room:', roomId);
    const room = await Room.getRoom(roomId);
    if (!room) {
      return await ctx.reply('❌ Room not found or has expired.');
    }

    if (!room.clientRoom) {
      console.error('Invalid room data structure:', room);
      return await ctx.reply('❌ Error loading game data. Please try again.');
    }

    // Display game status in group
    await ctx.reply(
      `*🎮 Current Game Status*\n` +
      `Room ID: ${roomId}\n` +
      `Top Card:`,
      {
        parse_mode: 'Markdown'
      }
    );

    // Show top card in group
    await ctx.replyWithPhoto(
      cardUrls[room.clientRoom.topCard],
      { caption: '🎴 Current Top Card' }
    );

    await ctx.reply(
      `Players in game:`,
      {
        parse_mode: 'Markdown',
        ...createGameStatusMarkup(room)
      }
    );

    // Send private hands to each player
    const userHandler = require('./userHandler');
    for (const player of room.clientRoom.playerList) {
      await userHandler.displayPlayerInterface(ctx, roomId, player.userId);
    }

  } catch (error) {
    console.error('Error in room display handler:', error);
    await ctx.reply('Sorry, there was an error displaying the game room.');
  }
}

async function handleJoinRoom(ctx) {
  try {
    const roomId = ctx.callbackQuery.data.split('_')[2];
    const userId = ctx.from.id;
    const username = ctx.from.username || 
      `${ctx.from.first_name}${ctx.from.last_name ? ' ' + ctx.from.last_name : ''}`;

    // Check if bot can message user
    try {
      await ctx.telegram.sendMessage(
        userId,
        '🎮 Checking if I can send you private messages...'
      );
    } catch (error) {
      return await ctx.answerCbQuery(
        '❌ Please start a private chat with me first by clicking my username!',
        { show_alert: true }
      );
    }

    const room = await Room.getRoom(roomId);
    
    if (!room || !room.clientRoom) {
      return await ctx.answerCbQuery('❌ Room not found or has expired.');
    }

    const maxPlayers = room.clientRoom.maxPlayers || 6;
    if (room.clientRoom.playerList.length >= maxPlayers) {
      return await ctx.answerCbQuery('❌ Room is full!');
    }

    if (room.clientRoom.playerList.some(p => p.userId === userId)) {
      return await ctx.answerCbQuery('✋ You are already in this game!');
    }

    // Add player to room
    await Room.joinRoom(roomId, { userId, username, hand: [] });
    
    // Refresh the display for all players
    await handleRoomDisplay(ctx, roomId);
    await ctx.answerCbQuery('✅ Successfully joined the game!');

  } catch (error) {
    console.error('Error in join room handler:', error);
    await ctx.answerCbQuery('Error joining the room');
  }
}

module.exports = {
  handleRoomDisplay,
  handleJoinRoom
};
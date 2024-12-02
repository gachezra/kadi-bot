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
    text: `Cards in Deck: ${room.clientRoom.deck?.length || '?'} | Direction: ${room.clientRoom.isClockwise ? '➡️' : '⬅️'}`,
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
    gameInfoRow
  ]);
}

async function handleRoomDisplay(ctx, roomId) {
  try {
    const room = await Room.getRoom(roomId);
    if (!room) {
      return await ctx.reply('❌ Room not found or has expired.');
    }

    if (!room.clientRoom) {
      console.error('Invalid room data structure:', room);
      return await ctx.reply('❌ Error loading game data. Please try again.');
    }

    // Send game status to each player
    for (const player of room.clientRoom.playerList) {
      const statusMessage = 
        `*🎮 Game Status Update*\n` +
        `Room ID: ${roomId}\n` +
        `Your turn: ${player.userId === room.clientRoom.currentPlayer ? 'Yes ✅' : 'No ⏳'}\n\n` +
        `Players in game:`;

      await ctx.telegram.sendMessage(
        player.userId,
        statusMessage,
        {
          parse_mode: 'Markdown',
          ...createGameStatusMarkup(room)
        }
      );

      // Send top card to each player
      await ctx.telegram.sendPhoto(
        player.userId,
        cardUrls[room.clientRoom.topCard],
        { caption: '🎴 Current Top Card' }
      );
    }

    // Update player interfaces
    const userHandler = require('./userHandler');
    for (const player of room.clientRoom.playerList) {
      await userHandler.displayPlayerInterface(ctx, roomId, player.userId);
    }

  } catch (error) {
    console.error('Error in room display handler:', error);
    await ctx.reply('Sorry, there was an error displaying the game room.');
  }
}

async function handleJoinRoom(ctx, roomId) {
  try {
    const userId = ctx.from.id;
    const username = ctx.from.username || 
      `${ctx.from.first_name}${ctx.from.last_name ? ' ' + ctx.from.last_name : ''}`;

    const room = await Room.getRoom(roomId);
    
    if (!room || !room.clientRoom) {
      return await ctx.reply('❌ Room not found or has expired.');
    }

    const maxPlayers = room.clientRoom.maxPlayers || 6;
    if (room.clientRoom.playerList.length >= maxPlayers) {
      return await ctx.reply('❌ Room is full!');
    }

    if (room.clientRoom.playerList.some(p => p.userId === userId)) {
      return await ctx.reply('✋ You are already in this game!');
    }

    // Add player to room
    await Room.joinRoom(roomId, { userId, username, hand: [] });
    
    // Notify all players
    for (const player of room.clientRoom.playerList) {
      await ctx.telegram.sendMessage(
        player.userId,
        `👋 ${username} has joined the game!`
      );
    }
    
    // Refresh the display for all players
    await handleRoomDisplay(ctx, roomId);

  } catch (error) {
    console.error('Error in join room handler:', error);
    await ctx.reply('Error joining the room');
  }
}

module.exports = {
  handleRoomDisplay,
  handleJoinRoom
};
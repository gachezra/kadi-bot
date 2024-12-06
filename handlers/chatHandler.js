require('dotenv').config();
const Redis = require('ioredis');
const redis = new Redis(`${process.env.REDIS}`);
const Room = require('../game/models/room');

async function updateUserGameMapping(userId, roomId) {
  await redis.set(`user:${userId}:game`, roomId);
}

async function removeUserGameMapping(userId) {
  await redis.del(`user:${userId}:game`);
}

async function getOtherPlayersInRoom(userId, roomId) {
  try {
    const room = await Room.getRoom(roomId);
    if (!room || !room.clientRoom) return [];
    
    return room.clientRoom.playerList
      .filter(player => player.userId !== userId)
      .map(player => player.userId);
  } catch (error) {
    console.error('Error getting other players:', error);
    return [];
  }
}

async function handleChat(ctx) {
  try {
    const userId = ctx.from.id;
    const roomId = await redis.get(`user:${userId}:room`);
    
    if (!roomId) {
      return await ctx.reply('You must be in a game to chat.');
    }

    const room = await Room.getRoom(roomId);
    if (!room || !room.clientRoom) {
      await removeUserGameMapping(userId);
      return await ctx.reply('You are not currently in an active game.');
    }

    const sender = room.clientRoom.playerList.find(p => p.userId === userId);
    if (!sender) {
      await removeUserGameMapping(userId);
      return await ctx.reply('You are not currently in this game.');
    }

    const senderName = sender.username;
    const messageText = ctx.message.text;
    const otherPlayers = await getOtherPlayersInRoom(userId, roomId);

    const messageToForward = `🎮 *Game Chat*\n👤 *${senderName}*\n💭 ${messageText}`;
    
    for (const playerId of otherPlayers) {
      try {
        await ctx.telegram.sendChatAction(playerId, 'typing');
        await ctx.telegram.sendMessage(playerId, messageToForward, {
          parse_mode: 'Markdown',
          disable_notification: true
        });
      } catch (error) {
        console.error(`Error sending message to player ${playerId}:`, error);
      }
    }

    await ctx.reply('✅ Message sent', {
      reply_to_message_id: ctx.message.message_id,
      disable_notification: true
    });
    
  } catch (error) {
    console.error('Error in chat handler:', error);
    await ctx.reply('❌ Failed to send message. Please try again.');
  }
}

module.exports = {
  handleChat,
  updateUserGameMapping,
  removeUserGameMapping
};
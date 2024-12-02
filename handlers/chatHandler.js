const Room = require('../game/models/room');

// Store user-room mappings for quick lookups
const userGameMap = new Map();

// Update user-room mapping when joining/creating games
function updateUserGameMapping(userId, roomId) {
    userGameMap.set(userId, roomId);
}

// Remove user-room mapping when leaving/game ends
function removeUserGameMapping(userId) {
    userGameMap.delete(userId);
}

// Get all other players in the same room
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
        const roomId = userGameMap.get(userId);
        
        // If user is not in a game, ignore the message
        if (!roomId) {
            return;
        }

        const room = await Room.getRoom(roomId);
        if (!room || !room.clientRoom) {
            removeUserGameMapping(userId);
            return await ctx.reply('You are not currently in an active game.');
        }

        const sender = room.clientRoom.playerList.find(p => p.userId === userId);
        if (!sender) {
            removeUserGameMapping(userId);
            return await ctx.reply('You are not currently in this game.');
        }

        const senderName = sender.username;
        const messageText = ctx.message.text;
        const otherPlayers = await getOtherPlayersInRoom(userId, roomId);

        // Forward message to all other players in the game
        const messageToForward = `💬 ${senderName}:\n${messageText}`;
        
        for (const playerId of otherPlayers) {
            try {
                await ctx.telegram.sendMessage(playerId, messageToForward);
            } catch (error) {
                console.error(`Error sending message to player ${playerId}:`, error);
            }
        }

    } catch (error) {
        console.error('Error in chat handler:', error);
        await ctx.reply('Sorry, there was an error processing your message.');
    }
}

// Export functions
module.exports = {
    handleChat,
    updateUserGameMapping,
    removeUserGameMapping
};
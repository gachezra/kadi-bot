async function handleWelcome(ctx) {
  try {
    await ctx.reply('Welcome to NikoKadi',
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Create Room', callback_data: 'create' },
              { text: 'Show Rooms', callback_data: 'groups' }
            ],
            [{ text: 'Invite Other Players', callback_data: 'settings' }]
          ]
        }
      }
    );
  } catch (error) {
    console.error('Error in handleWelcome:', error);
    ctx.reply('Sorry, there was an error processing your request.');
  }
}

module.exports = { handleWelcome };
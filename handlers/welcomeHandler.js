const { Markup } = require('telegraf');

async function handleWelcome(ctx) {
  try {
    const mainMenu = Markup.inlineKeyboard([
      [Markup.button.callback('📊 View Statistics', 'stats')],
      [Markup.button.callback('👥 Manage Groups', 'groups')],
      [Markup.button.callback('⚙️ Settings', 'settings')]
    ]);

    await ctx.reply('Welcome to the Bot! Choose an option:', mainMenu);
  } catch (error) {
    console.error('Error in handleWelcome:', error);
  }
}

module.exports = { handleWelcome };
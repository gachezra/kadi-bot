const { Markup } = require('telegraf');

async function handleWelcome(ctx, isEdit = false) {
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🔄 Refresh Content', 'refresh')],
    [Markup.button.callback('⚙️ Settings', 'settings')],
    [Markup.button.callback('❓ Help', 'help')]
  ]);

  const content = `
Welcome to the Dynamic Bot!

Current Time: ${new Date().toLocaleTimeString()}
Status: Active
  `;

  if (isEdit && ctx.callbackQuery) {
    // Edit existing message
    await ctx.editMessageText(content, keyboard);
  } else {
    // Send new message
    await ctx.reply(content, keyboard);
  }
}

module.exports = { handleWelcome };
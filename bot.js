const { Telegraf, Markup } = require('telegraf');
const { handleWelcome } = require('./handlers/welcomeHandler');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);

// Start command shows the main menu
bot.start(handleWelcome);

// Handle Statistics button
bot.action('stats', async (ctx) => {
  const statsKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('Today', 'stats_today')],
    [Markup.button.callback('This Week', 'stats_week')],
    [Markup.button.callback('« Back', 'back_main')]
  ]);
  
  await ctx.editMessageText('📊 Statistics Menu:', statsKeyboard);
});

// Handle Groups button
bot.action('groups', async (ctx) => {
  const groupsKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('Create Group', 'create_group')],
    [Markup.button.callback('List Groups', 'list_groups')],
    [Markup.button.callback('« Back', 'back_main')]
  ]);
  
  await ctx.editMessageText('👥 Group Management:', groupsKeyboard);
});

// Handle Settings button
bot.action('settings', async (ctx) => {
  const settingsKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('Notifications', 'settings_notif')],
    [Markup.button.callback('Privacy', 'settings_privacy')],
    [Markup.button.callback('« Back', 'back_main')]
  ]);
  
  await ctx.editMessageText('⚙️ Settings Menu:', settingsKeyboard);
});

// Handle back button
bot.action('back_main', async (ctx) => {
  const mainMenu = Markup.inlineKeyboard([
    [Markup.button.callback('📊 View Statistics', 'stats')],
    [Markup.button.callback('👥 Manage Groups', 'groups')],
    [Markup.button.callback('⚙️ Settings', 'settings')]
  ]);
  
  await ctx.editMessageText('Main Menu:', mainMenu);
});

// Example of handling a specific submenu action
bot.action('stats_today', async (ctx) => {
  // Generate some dummy stats
  const currentTime = new Date().toLocaleTimeString();
  const statsText = `
Today's Statistics (as of ${currentTime}):
• Users: 150
• Messages: 1,024
• Active Groups: 5
  `;
  
  const backButton = Markup.inlineKeyboard([
      [Markup.button.callback('« Back to Stats', 'stats')]
  ]);
  
  await ctx.editMessageText(statsText, backButton);
});

// Error handling
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
});

// Start bot
bot.launch().then(() => {
  console.log('Bot started');
}).catch(err => console.error(err));
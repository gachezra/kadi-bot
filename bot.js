const { Telegraf, Markup } = require('telegraf');
const { handleWelcome } = require('./handlers/welcomeHandler');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);

// Start command shows the main menu
bot.start(handleWelcome);

// Handle card selection callbacks
bot.action('create', async (ctx) => {
  try {
    const createGroup = `To create a room:
-Create a group and add me as an admin.
-An invitation link will be created, share it with your friends
    `
    await ctx.reply(createGroup);
    // await ctx.editMessageMedia(
    //   {
    //     type: 'photo',
    //     media: cardUrl
    //   },
    //   {
    //     reply_markup: {
    //       inline_keyboard: [
    //         [
    //           { text: 'Drop', callback_data: 'stats' },
    //           { text: 'Pick', callback_data: 'groups' }
    //         ],
    //         [{ text: 'NikoKadi', callback_data: 'settings' }],
    //         randomCards.map(card => ({
    //           text: card,
    //           callback_data: `card:${card}`
    //         }))
    //       ]
    //     }
    //   }
    // );

    // Answer the callback query to remove the loading state
  } catch (error) {
    console.error('Error handling card selection:', error);
    await ctx.answerCbQuery('Sorry, there was an error processing your selection.');
  }
});

// Error handling
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
});

// Start bot
bot.launch().then(() => {
  console.log('Bot started');
}).catch(err => console.error(err));
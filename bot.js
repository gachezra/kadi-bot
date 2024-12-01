const { Telegraf } = require('telegraf');
const { 
  handleWelcome,
  handleCreateGroup,
  handleCheckGroups,
  handleHelp 
} = require('./handlers/welcomeHandler');
const {
  handleDecreasePlayer,
  handleIncreasePlayer,
  handleGameBegin,
  handleGameStart
} = require('./handlers/gameHandler');
const { handleJoinRoom } = require('./handlers/roomHandler');
const {
  handleCardSelection,
  handleClearSelection,
  handlePickCard,
  handleDropCards
} = require('./handlers/userHandler');

require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);

// Command handlers
bot.command('start', handleWelcome);
bot.command('play', handleGameStart);

// Welcome menu actions
bot.action('create_group', handleCreateGroup);
bot.action('check_groups', handleCheckGroups);
bot.action('help', handleHelp);
bot.action('back_to_menu', async (ctx) => {
  try {
    await handleWelcome(ctx);
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Error returning to menu:', error);
    await ctx.answerCbQuery('Error returning to menu');
  }
});

// Game setup actions
bot.action('decrease_players', handleDecreasePlayer);
bot.action('increase_players', handleIncreasePlayer);
bot.action('start_game', handleGameBegin);

// Room actions
bot.action(/^join_game_[\w]+/, handleJoinRoom);

// Card selection and game actions
bot.action(/^select_card_.*$/, handleCardSelection);
bot.action('clear_selection', handleClearSelection);
bot.action('pick_card', handlePickCard);
bot.action('drop_cards', handleDropCards);

// debuging purposes
bot.on('callback_query', (ctx) => {
  console.log('Received callback query:', ctx.callbackQuery.data);
});

// Error handling
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
});

// Start bot
bot.launch()
  .then(() => console.log('Bot started'))
  .catch(err => console.error('Bot startup error:', err));

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
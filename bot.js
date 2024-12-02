const { Telegraf } = require('telegraf');
const { 
  handleWelcome,
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
const { handleChat } = require('./handlers/chatHandler');

require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);

// Command handlers
bot.command('start', async (ctx) => {
  const startPayload = ctx.message.text.split(' ')[1];
  
  if (startPayload && startPayload.startsWith('join_')) {
    const roomId = startPayload.replace('join_', '');
    await handleJoinRoom(ctx, roomId);
  } else {
    await handleWelcome(ctx);
  }
});

bot.command('play', handleGameStart);
bot.command('help', handleHelp);

// Game setup actions
bot.action('decrease_players', handleDecreasePlayer);
bot.action('increase_players', handleIncreasePlayer);
bot.action('start_game', handleGameBegin);

// Card selection and game actions
bot.action(/^select_card_.*$/, handleCardSelection);
bot.action('clear_selection', handleClearSelection);
bot.action('pick_card', handlePickCard);
bot.action('drop_cards', handleDropCards);

// Handle regular messages (chat between players)
bot.on('text', handleChat);

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
process.once('SIGTERM', () => bot.stop('SIGTERM'))
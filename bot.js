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
const Redis = require('ioredis');
const redis = new Redis(`${process.env.REDIS}`);

const bot = new Telegraf(process.env.BOT_TOKEN);

// Command handlers
bot.command('start', async (ctx) => {
  const startPayload = ctx.message.text.split(' ')[1];
  
  if (startPayload && startPayload.startsWith('join_')) {
    const roomId = startPayload.replace('join_', '');
    const userId = ctx.from.id;
    await redis.set(`user:${userId}:room`, roomId);
    // Set TTL for 4 hours
    await redis.expire(`user:${userId}:room`, 14400);
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

// Graceful Redis shutdown
const gracefulShutdown = async () => {
  console.log('Shutting down...');
  await redis.quit();
  await bot.stop('SIGTERM');
  process.exit(0);
};

// Start bot
bot.launch()
  .then(() => console.log('Bot started'))
  .catch(err => console.error('Bot startup error:', err));

// Enable graceful stop
process.once('SIGINT', gracefulShutdown);
process.once('SIGTERM', gracefulShutdown);
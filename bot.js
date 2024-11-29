const { Telegraf, Markup } = require('telegraf');
const { handleWelcome } = require('./handlers/welcomeHandler');
require('dotenv').config();

// Initialize bot with token
const bot = new Telegraf(process.env.BOT_TOKEN);

// Handle /start command
bot.command('start', async (ctx) => {
  await handleWelcome(ctx);
});

// Handle /creategroup command
bot.command('creategroup', async (ctx) => {
  try {
    // Extract group name from message
    const groupName = ctx.message.text.split(' ').slice(1).join(' ');
    
    if (!groupName) {
      return await ctx.reply('Please provide a group name: /creategroup <name>');
    }

    // Create supergroup
    const chatCreated = await ctx.telegram.createChatInviteLink(ctx.chat.id, {
      name: groupName,
      creates_join_request: true // This makes the group private by requiring join approval
    });

    // Set restrictive permissions for the group
    await ctx.telegram.setChatPermissions(chatCreated.chat.id, {
      can_send_messages: false,
      can_send_media_messages: false,
      can_send_polls: false,
      can_send_other_messages: false,
      can_add_web_page_previews: false,
      can_change_info: false,
      can_invite_users: false,
      can_pin_messages: false
    });

    // Make bot admin
    await ctx.telegram.promoteChatMember(chatCreated.chat.id, ctx.botInfo.id, {
      can_manage_chat: true,
      can_post_messages: true,
      can_edit_messages: true,
      can_delete_messages: true,
      can_manage_video_chats: true,
      can_restrict_members: true,
      can_promote_members: true,
      can_change_info: true,
      can_invite_users: true,
      can_pin_messages: true
    });

    await ctx.reply(`Created private group: ${groupName}\nInvite link: ${chatCreated.invite_link}`);
  } catch (error) {
    console.error('Error creating group:', error);
    await ctx.reply('Failed to create group. Make sure the bot has the necessary permissions.');
  }
});

// Handle callback queries (button clicks)
bot.on('callback_query', async (ctx) => {
  try {
    const action = ctx.callbackQuery.data;
    
    switch (action) {
      case 'refresh':
        await handleWelcome(ctx, true);
        break;
      case 'settings':
        await ctx.answerCbQuery('Opening settings...');
        await ctx.reply('⚙️ Settings Menu:', 
          Markup.inlineKeyboard([
            [Markup.button.callback('Notifications', 'settings_notifications')],
            [Markup.button.callback('Privacy', 'settings_privacy')],
            [Markup.button.callback('Back to Main Menu', 'back_main')]
          ])
        );
        break;
      case 'help':
        await ctx.answerCbQuery('Opening help...');
        await ctx.reply('Available commands:\n' +
          '/start - Show main menu\n' +
          '/creategroup <name> - Create a private group');
        break;
      case 'back_main':
        await handleWelcome(ctx, true);
        break;
      default:
        await ctx.answerCbQuery();
    }
  } catch (error) {
    console.error('Error handling callback:', error);
    await ctx.answerCbQuery('An error occurred');
  }
});

// Error handling
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
});

// Start bot
bot.launch()
  .then(() => console.log('Bot is running...'))
  .catch(err => console.error('Bot launch failed:', err));

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
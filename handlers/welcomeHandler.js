async function handleWelcome(ctx) {
  try {
    // Send welcome message with main menu
    await ctx.reply(
      `🎮 *Welcome to NikoKadi Card Game!*\n\n` +
      `To get started, you can:\n` +
      `• Create a new game group\n` +
      `• Check your existing groups\n` +
      `• Read the help guide\n\n` +
      `Select an option below:`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🎲 Create Game Group', callback_data: 'create_group' }],
            [{ text: '🔍 Check Groups', callback_data: 'check_groups' }],
            [{ text: '❓ Help', callback_data: 'help' }]
          ]
        }
      }
    );
  } catch (error) {
    console.error('Error in welcome handler:', error);
    ctx.reply('Sorry, there was an error. Please try again.');
  }
}

async function handleCreateGroup(ctx) {
  try {
    const message = `
*🎲 Creating a New Game Group*

Follow these steps:
1. Click the menu button in Telegram
2. Select "New Group"
3. Add this bot (@${ctx.botInfo.username})
4. Set the bot as an administrator with these permissions:
   • Delete Messages
   • Pin Messages

*Important*: The bot needs admin rights to manage the game properly.

Once you've created the group, click "Check Groups" to verify the setup.`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Back to Menu', callback_data: 'back_to_menu' }]
        ]
      }
    });
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Error in create group handler:', error);
    await ctx.answerCbQuery('Error showing group creation instructions');
  }
}

async function handleCheckGroups(ctx) {
  try {
    // Get bot's group memberships
    const groups = await getGroupMemberships(ctx.botInfo.id);
    
    let message;
    if (groups.length === 0) {
      message = `
*No Game Groups Found* 🔍

You haven't added me to any groups yet.
Use the "Create Game Group" button to get started!`;
    } else {
      message = `
*Your Game Groups* 🎮

${groups.map((group, index) => 
  `${index + 1}. ${group.title}${group.isAdmin ? ' ✅' : ' ⚠️'}`
).join('\n')}

✅ = Bot is admin
⚠️ = Bot needs admin rights`;
    }

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🔄 Refresh', callback_data: 'check_groups' },
            { text: '🔙 Back', callback_data: 'back_to_menu' }
          ]
        ]
      }
    });
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Error in check groups handler:', error);
    await ctx.answerCbQuery('Error checking groups');
  }
}

async function handleHelp(ctx) {
  try {
    const message = `
*How to Play NikoKadi* 🎴

*Setup:*
1. Create a new group
2. Add the bot as admin
3. Start a new game with /play

*Game Rules:*
• Each player gets a turn
• On your turn, you can:
  - Pick the current card
  - Drop it and draw next
• First to complete their set wins!

*Commands:*
/start - Show main menu
/play - Start new game
/rules - Show detailed rules
/end - End current game

*Need Help?*
Contact @YourSupportUsername`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Back to Menu', callback_data: 'back_to_menu' }]
        ]
      }
    });
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Error in help handler:', error);
    await ctx.answerCbQuery('Error displaying help');
  }
}

// Helper function to check bot's group memberships
async function getGroupMemberships(botId) {
  try {
    // This is a placeholder - you'll need to implement actual group checking
    // You might want to use a database to store group information
    return [
      // Example return format:
      // { title: 'Group Name', isAdmin: true }
    ];
  } catch (error) {
    console.error('Error getting group memberships:', error);
    return [];
  }
}

module.exports = {
  handleWelcome,
  handleCreateGroup,
  handleCheckGroups,
  handleHelp
};
/**
 * Basic command handlers for the Telegram bot
 */

// Handle /start command
const handleStart = (bot) => (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name;
  
  const message = `Hello ${firstName}! Welcome to RightelYar Bot.

This bot helps you manage and track your Rightel SIM cards charging schedule.

Available commands:
/viewsims - View all SIM cards and their status
/markcharged - Mark a SIM card as charged
/viewreminders - View SIM cards due for charging
/addsim - Add a new SIM card to the database
/help - Show this help message`;

  bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: {
      keyboard: [
        ['📱 View SIM Cards', '💰 Mark as Charged'],
        ['⏰ View Reminders', '➕ Add SIM Card'],
        ['❓ Help']
      ],
      resize_keyboard: true
    }
  });
};

// Handle /help command
const handleHelp = (bot) => (msg) => {
  const chatId = msg.chat.id;
  
  const message = `*RightelYar Bot Help*

This bot helps you manage and track your Rightel SIM cards charging schedule.

*Available commands:*
/view_sims - View all SIM cards and their status
/mark_charged - Mark a SIM card as charged
/view_reminders - View SIM cards due for charging
/view_history - View charging history for SIM cards
/help - Show this help message

You can also use the keyboard buttons for easier navigation.`;

  bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown'
  });
};

module.exports = {
  handleStart,
  handleHelp
};
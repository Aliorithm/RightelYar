require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const moment = require('moment');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Telegram bot
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Admin IDs
const adminIds = process.env.ADMIN_TELEGRAM_IDS.split(',').map(id => id.trim());

// Days threshold for reminders
const reminderDays = parseInt(process.env.REMINDER_DAYS) || 150;

// Import handlers
const { handleStart, handleHelp } = require('./handlers/basicHandlers');
const { handleViewSims, handleMarkCharged, handleViewReminders } = require('./handlers/simHandlers');
const { checkAndSendReminders } = require('./handlers/reminderHandler');

// Check if user is admin
function isAdmin(userId) {
  return adminIds.includes(userId.toString());
}

// Check admin status for all messages and handle keyboard buttons
bot.on('message', (msg) => {
  // Skip admin check for command handlers as they'll have their own checks
  if (msg.text && msg.text.startsWith('/')) {
    return;
  }
  
  if (msg.from && !isAdmin(msg.from.id)) {
    bot.sendMessage(msg.chat.id, 'Sorry, this bot is only available for authorized administrators.');
    return;
  }
  
  // Handle keyboard button presses
  if (msg.text) {
    switch (msg.text) {
      case '📱 View SIM Cards':
        handleViewSims(bot, supabase)(msg);
        break;
      case '💰 Mark as Charged':
        handleMarkCharged(bot, supabase)(msg);
        break;
      case '⏰ View Reminders':
        handleViewReminders(bot, supabase, reminderDays)(msg);
        break;

      case '➕ Add SIM Card':
        // Trigger the same flow as /addsim command
        bot.sendMessage(msg.chat.id, 'Please enter the SIM card number in the format: 0921-XXX-XXXX', {
          reply_markup: {
            force_reply: true
          }
        }).then(sentMessage => {
          const chatId = msg.chat.id;
          const messageId = sentMessage.message_id;
          
          // Create a listener for the reply
          const replyListener = bot.onReplyToMessage(chatId, messageId, async (replyMsg) => {
            const simNumber = replyMsg.text.trim();
            
            // Validate SIM card number format
            const simNumberRegex = /^0\d{3}-\d{3}-\d{4}$|^0\d{10}$/;
            if (!simNumberRegex.test(simNumber)) {
              bot.sendMessage(chatId, 'Invalid SIM card number format. Please use the format: 0921-XXX-XXXX');
              return;
            }
            
            try {
              // Check if SIM card already exists
              const { data: existingSim, error: checkError } = await supabase
                .from('sims')
                .select('*')
                .eq('number', simNumber)
                .maybeSingle();
                
              if (checkError) throw checkError;
              
              if (existingSim) {
                bot.sendMessage(chatId, `SIM card ${simNumber} already exists in the database.`);
                return;
              }
              
              // Add SIM card to database
              const { data: newSim, error: insertError } = await supabase
                .from('sims')
                .insert({
                  number: simNumber
                })
                .select()
                .single();
                
              if (insertError) throw insertError;
              
              bot.sendMessage(chatId, `✅ SIM card ${simNumber} has been added to the database.`);
            } catch (error) {
              console.error('Error adding SIM card:', error);
              bot.sendMessage(chatId, 'Error adding SIM card. Please try again later.');
            }
          });
          
          // Remove the listener after 5 minutes (300000 ms)
          setTimeout(() => {
            bot.removeReplyListener(replyListener);
          }, 300000);
        });
        break;
      case '❓ Help':
        handleHelp(bot)(msg);
        break;
    }
  }
});

// Command handlers with admin checks
bot.onText(/\/start/, (msg) => {
  if (!isAdmin(msg.from.id)) {
    bot.sendMessage(msg.chat.id, 'Sorry, this bot is only available for authorized administrators.');
    return;
  }
  handleStart(bot)(msg);
});

bot.onText(/\/help/, (msg) => {
  if (!isAdmin(msg.from.id)) {
    bot.sendMessage(msg.chat.id, 'Sorry, this bot is only available for authorized administrators.');
    return;
  }
  handleHelp(bot)(msg);
});

// Support both command formats for backward compatibility
bot.onText(/\/(viewsims|view_sims)/, (msg) => {
  if (!isAdmin(msg.from.id)) {
    bot.sendMessage(msg.chat.id, 'Sorry, this bot is only available for authorized administrators.');
    return;
  }
  handleViewSims(bot, supabase)(msg);
});

bot.onText(/\/(markcharged|mark_charged)/, (msg) => {
  if (!isAdmin(msg.from.id)) {
    bot.sendMessage(msg.chat.id, 'Sorry, this bot is only available for authorized administrators.');
    return;
  }
  handleMarkCharged(bot, supabase)(msg);
});

bot.onText(/\/(viewreminders|view_reminders)/, (msg) => {
  if (!isAdmin(msg.from.id)) {
    bot.sendMessage(msg.chat.id, 'Sorry, this bot is only available for authorized administrators.');
    return;
  }
  handleViewReminders(bot, supabase, reminderDays)(msg);
});



// Add SIM card handler
bot.onText(/\/addsim/, (msg) => {
  if (!isAdmin(msg.from.id)) {
    bot.sendMessage(msg.chat.id, 'Sorry, this bot is only available for authorized administrators.');
    return;
  }
  
  bot.sendMessage(msg.chat.id, 'Please enter the SIM card number in the format: 0921-XXX-XXXX', {
    reply_markup: {
      force_reply: true
    }
  }).then(sentMessage => {
    const chatId = msg.chat.id;
    const messageId = sentMessage.message_id;
    
    // Create a listener for the reply
    const replyListener = bot.onReplyToMessage(chatId, messageId, async (replyMsg) => {
      const simNumber = replyMsg.text.trim();
      
      // Validate SIM card number format
      const simNumberRegex = /^0\d{3}-\d{3}-\d{4}$|^0\d{10}$/;
      if (!simNumberRegex.test(simNumber)) {
        bot.sendMessage(chatId, 'Invalid SIM card number format. Please use the format: 0921-XXX-XXXX');
        return;
      }
      
      try {
        // Check if SIM card already exists
        const { data: existingSim, error: checkError } = await supabase
          .from('sims')
          .select('*')
          .eq('number', simNumber)
          .maybeSingle();
          
        if (checkError) throw checkError;
        
        if (existingSim) {
          bot.sendMessage(chatId, `SIM card ${simNumber} already exists in the database.`);
          return;
        }
        
        // Add SIM card to database
        const { data: newSim, error: insertError } = await supabase
          .from('sims')
          .insert({
            number: simNumber
          })
          .select()
          .single();
          
        if (insertError) throw insertError;
        
        bot.sendMessage(chatId, `✅ SIM card ${simNumber} has been added to the database.`);
      } catch (error) {
        console.error('Error adding SIM card:', error);
        bot.sendMessage(chatId, 'Error adding SIM card. Please try again later.');
      }
    });
    
    // Remove the listener after 5 minutes (300000 ms)
    setTimeout(() => {
      bot.removeReplyListener(replyListener);
    }, 300000);
  });
});

// Handle callback queries
bot.on('callback_query', async (callbackQuery) => {
  const data = callbackQuery.data;
  const msg = callbackQuery.message;
  const userId = callbackQuery.from.id;
  const chargedBy = `${callbackQuery.from.first_name} ${callbackQuery.from.last_name || ''}`.trim();

  if (!isAdmin(userId)) {
    bot.answerCallbackQuery(callbackQuery.id, { text: 'Unauthorized access' });
    return;
  }

  if (data.startsWith('mark_charged:')) {
    const simId = data.split(':')[1];
    try {
      const { data: sim, error } = await supabase
        .from('sims')
        .select('*')
        .eq('id', simId)
        .single();

      if (error) throw error;

      const now = new Date();
      
      // Update the SIM card's last charged date
      const { error: updateError } = await supabase
        .from('sims')
        .update({ 
          last_charged: now.toISOString(),
          charged_by: chargedBy
        })
        .eq('id', simId);

      if (updateError) throw updateError;

      bot.answerCallbackQuery(callbackQuery.id, { 
        text: `SIM ${sim.number} marked as charged!` 
      });
      
      bot.editMessageText(
        `✅ SIM ${sim.number} has been marked as charged by ${chargedBy}.`,
        {
          chat_id: msg.chat.id,
          message_id: msg.message_id,
          reply_markup: {
            inline_keyboard: [[
              { text: 'Back to SIM List', callback_data: 'view_sims' }
            ]]
          }
        }
      );
    } catch (error) {
      console.error('Error marking SIM as charged:', error);
      bot.answerCallbackQuery(callbackQuery.id, { 
        text: 'Error marking SIM as charged. Please try again.' 
      });
    }
  } else if (data === 'view_sims') {
    handleViewSims(bot, supabase)(msg);
  }
});

// Schedule daily reminder check
cron.schedule('0 9 * * *', () => {
  checkAndSendReminders(bot, supabase, adminIds, reminderDays);
});

console.log('Bot is running...');
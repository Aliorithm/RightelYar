require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const moment = require('moment');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

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
const reminderDays = parseInt(process.env.REMINDER_DAYS) || 60;

// Import handlers
const { handleStart, handleHelp } = require('./handlers/basicHandlers');
const { handleViewSims, handleMarkCharged, handleViewReminders } = require('./handlers/simHandlers');
const { checkAndSendReminders } = require('./handlers/reminderHandler');
// Prepare reminder check runner for cron and HTTP endpoint
const runReminderCheck = checkAndSendReminders(bot, supabase, adminIds, reminderDays);

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
    bot.sendMessage(msg.chat.id, 'اشتباه اومدی به این پارتی دعوت نشدی!');
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
        bot.sendMessage(msg.chat.id, 'لطفا شماره رو به فرمت درست وارد کن: 0921-XXX-XXXX', {
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
              bot.sendMessage(chatId, 'فرمت درست رو وارد نکردی');
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
                bot.sendMessage(chatId, `شماره ${simNumber} از قبل ذخیره شده.`);
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
              
              bot.sendMessage(chatId, `✅ شماره ${simNumber} به دیتابیس اضافه شد.`);
            } catch (error) {
              console.error('Error adding SIM card:', error);
              bot.sendMessage(chatId, 'مشکل برام پیش آمده. به علی بگین درستم کنه');
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
    bot.sendMessage(msg.chat.id, 'اشتباه اومدی به این پارتی دعوت نشدی');
    return;
  }
  handleStart(bot)(msg);
});

bot.onText(/\/help/, (msg) => {
  if (!isAdmin(msg.from.id)) {
    bot.sendMessage(msg.chat.id, 'اشتباه اومدی به این پارتی دعوت نشدی');
    return;
  }
  handleHelp(bot)(msg);
});

// Support both command formats for backward compatibility
bot.onText(/\/(viewsims|view_sims)/, (msg) => {
  if (!isAdmin(msg.from.id)) {
    bot.sendMessage(msg.chat.id, 'اشتباه اومدی به این پارتی دعوت نشدی');
    return;
  }
  handleViewSims(bot, supabase)(msg);
});

bot.onText(/\/(markcharged|mark_charged)/, (msg) => {
  if (!isAdmin(msg.from.id)) {
    bot.sendMessage(msg.chat.id, 'اشتباه اومدی به این پارتی دعوت نشدی');
    return;
  }
  handleMarkCharged(bot, supabase)(msg);
});

bot.onText(/\/(viewreminders|view_reminders)/, (msg) => {
  if (!isAdmin(msg.from.id)) {
    bot.sendMessage(msg.chat.id, 'اشتباه اومدی به این پارتی دعوت نشدی');
    return;
  }
  handleViewReminders(bot, supabase, reminderDays)(msg);
});



// Add SIM card handler
bot.onText(/\/addsim/, (msg) => {
  if (!isAdmin(msg.from.id)) {
    bot.sendMessage(msg.chat.id, 'اشتباه اومدی به این پارتی دعوت نشدی');
    return;
  }
  
  bot.sendMessage(msg.chat.id, 'لطفا شماره رو به فرمت درست وارد کن: 0921-XXX-XXXX', {
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
        bot.sendMessage(chatId, 'فرمت رو به درستی رعایت نکردی');
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
          bot.sendMessage(chatId, `شماره ${simNumber} از قبل داخل دیتابیس ذخیره شده.`);
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
        
        bot.sendMessage(chatId, `✅ شماره ${simNumber} به دیتابیس اضافه شد.`);
      } catch (error) {
        console.error('Error adding SIM card:', error);
        bot.sendMessage(chatId, 'مشکل برام پیش آمده به علی بگین درستم کنه');
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
        text: `وضعیت شماره ${sim.number} شارژ شد!` 
      });
      
      bot.editMessageText(
        `✅ شماره ${sim.number} توسط ${chargedBy} شارژ شد.`,
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
        text: 'خطا.' 
      });
    }
  } else if (data === 'view_sims') {
    handleViewSims(bot, supabase)(msg);
  } else if (data.startsWith('page:')) {
    // Handle pagination for mark_charged
    bot.answerCallbackQuery(callbackQuery.id);
    // Pass the callback query to the handler with the message and data
    handleMarkCharged(bot, supabase)({
      chat_id: msg.chat.id,
      message: msg,
      data: data
    });
  } else if (data === 'noop') {
    // No operation for the page indicator button
    bot.answerCallbackQuery(callbackQuery.id);
  }
});

// Schedule daily reminder check
cron.schedule('0 9 * * *', runReminderCheck, { timezone: 'Asia/Tehran' });

// HTTP server for Render (health and cron trigger)
app.get('/', async (req, res) => {
  res.send('RightelYar bot is running');
});

app.get('/healthz', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/cron/check', async (req, res) => {
  try {
    await runReminderCheck();
    res.json({ status: 'ok', triggered: true });
  } catch (err) {
    console.error('Error triggering reminder check via HTTP:', err);
    res.status(500).json({ status: 'error', message: 'Failed to run reminder check' });
  }
});

app.listen(PORT, () => {
  console.log(`HTTP server listening on port ${PORT}`);
});

console.log('Bot is running...');
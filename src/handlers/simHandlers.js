/**
 * SIM card related handlers for the Telegram bot
 */
const moment = require('moment');

// Format days remaining with appropriate emoji
const formatDaysRemaining = (daysRemaining) => {
  if (daysRemaining <= 0) {
    return `🚨 Expired (${daysRemaining} days)`;
  } else if (daysRemaining <= 30) {
    return `⚠️ Critical (${daysRemaining} days left)`;
  } else if (daysRemaining <= 60) {
    return `⚠️ Warning (${daysRemaining} days left)`;
  } else {
    return `✅ Good (${daysRemaining} days left)`;
  }
};

// Handle /view_sims command
const handleViewSims = (bot, supabase) => async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    // Send loading message
    const loadingMsg = await bot.sendMessage(chatId, 'Loading SIM cards...');
    
    // Get all SIM cards from database
    const { data: sims, error } = await supabase
      .from('sims')
      .select('*')
      .order('number');
    
    if (error) throw error;
    
    if (!sims || sims.length === 0) {
      return bot.editMessageText('No SIM cards found in the database.', {
        chat_id: chatId,
        message_id: loadingMsg.message_id
      });
    }
    
    // Create message with SIM cards info
    const now = moment();
    let message = '*📱 SIM Cards List*\n\n';
    
    sims.forEach((sim, index) => {
      const lastCharged = sim.last_charged ? moment(sim.last_charged) : null;
      const daysRemaining = lastCharged ? 180 - now.diff(lastCharged, 'days') : 'Never charged';
      
      message += `*${index + 1}. ${sim.number}*\n`;
      message += `Last charged: ${lastCharged ? lastCharged.format('YYYY-MM-DD') : 'Never'}\n`;
      message += `Status: ${typeof daysRemaining === 'number' ? formatDaysRemaining(daysRemaining) : daysRemaining}\n`;
      if (sim.charged_by) {
        message += `Last charged by: ${sim.charged_by}\n`;
      }
      message += '\n';
    });
    
    // Edit the loading message with the SIM cards info
    bot.editMessageText(message, {
      chat_id: chatId,
      message_id: loadingMsg.message_id,
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error('Error fetching SIM cards:', error);
    bot.sendMessage(chatId, 'Error fetching SIM cards. Please try again later.');
  }
};

// Handle /mark_charged command
const handleMarkCharged = (bot, supabase) => async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    // Get all SIM cards from database
    const { data: sims, error } = await supabase
      .from('sims')
      .select('*')
      .order('number');
    
    if (error) throw error;
    
    if (!sims || sims.length === 0) {
      return bot.sendMessage(chatId, 'No SIM cards found in the database.');
    }
    
    // Create inline keyboard with SIM cards
    const inlineKeyboard = [];
    const now = moment();
    
    sims.forEach((sim) => {
      const lastCharged = sim.last_charged ? moment(sim.last_charged) : null;
      const daysRemaining = lastCharged ? 180 - now.diff(lastCharged, 'days') : 'Never';
      
      inlineKeyboard.push([{
        text: `${sim.number} (${typeof daysRemaining === 'number' ? daysRemaining + ' days left' : daysRemaining})`,
        callback_data: `mark_charged:${sim.id}`
      }]);
    });
    
    // Send message with inline keyboard
    bot.sendMessage(chatId, '💰 *Select a SIM card to mark as charged:*', {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: inlineKeyboard
      }
    });
  } catch (error) {
    console.error('Error fetching SIM cards for marking:', error);
    bot.sendMessage(chatId, 'Error fetching SIM cards. Please try again later.');
  }
};

// Handle /view_reminders command
const handleViewReminders = (bot, supabase, reminderDays) => async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    // Send loading message
    const loadingMsg = await bot.sendMessage(chatId, 'Checking for SIM cards due for charging...');
    
    // Get all SIM cards from database
    const { data: sims, error } = await supabase
      .from('sims')
      .select('*')
      .order('number');
    
    if (error) throw error;
    
    if (!sims || sims.length === 0) {
      return bot.editMessageText('No SIM cards found in the database.', {
        chat_id: chatId,
        message_id: loadingMsg.message_id
      });
    }
    
    // Filter SIM cards that need charging
    const now = moment();
    const dueSims = sims.filter(sim => {
      if (!sim.last_charged) return true;
      
      const lastCharged = moment(sim.last_charged);
      const daysSinceCharge = now.diff(lastCharged, 'days');
      
      return daysSinceCharge >= reminderDays;
    });
    
    if (dueSims.length === 0) {
      return bot.editMessageText('✅ No SIM cards are due for charging at this time.', {
        chat_id: chatId,
        message_id: loadingMsg.message_id
      });
    }
    
    // Create message with due SIM cards
    let message = `⚠️ *${dueSims.length} SIM cards need charging:*\n\n`;
    
    dueSims.forEach((sim, index) => {
      const lastCharged = sim.last_charged ? moment(sim.last_charged) : null;
      const daysSinceCharge = lastCharged ? now.diff(lastCharged, 'days') : 'Never charged';
      const daysRemaining = lastCharged ? 180 - daysSinceCharge : 'N/A';
      
      message += `*${index + 1}. ${sim.number}*\n`;
      message += `Last charged: ${lastCharged ? lastCharged.format('YYYY-MM-DD') : 'Never'}\n`;
      message += `Days since last charge: ${daysSinceCharge}\n`;
      message += `Days remaining: ${typeof daysRemaining === 'number' ? daysRemaining : daysRemaining}\n`;
      if (sim.charged_by) {
        message += `Last charged by: ${sim.charged_by}\n`;
      }
      message += '\n';
    });
    
    // Add inline keyboard to mark SIMs as charged
    const inlineKeyboard = dueSims.map(sim => [{
      text: `Mark ${sim.number} as charged`,
      callback_data: `mark_charged:${sim.id}`
    }]);
    
    // Edit the loading message with the due SIM cards info
    bot.editMessageText(message, {
      chat_id: chatId,
      message_id: loadingMsg.message_id,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: inlineKeyboard
      }
    });
  } catch (error) {
    console.error('Error checking for due SIM cards:', error);
    bot.sendMessage(chatId, 'Error checking for due SIM cards. Please try again later.');
  }
};

module.exports = {
  handleViewSims,
  handleMarkCharged,
  handleViewReminders
};
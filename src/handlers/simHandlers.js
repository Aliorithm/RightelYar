/**
 * SIM card related handlers for the Telegram bot
 */
const moment = require("moment");

// Format days remaining with appropriate emoji
const formatDaysRemaining = (daysRemaining) => {
  if (daysRemaining <= 0) {
    return `🚨 گا (${daysRemaining} روز باقیمانده)`;
  } else if (daysRemaining <= 30) {
    return `⚠️ بحرانی (${daysRemaining} روز باقیمانده)`;
  } else if (daysRemaining <= 60) {
    return `⚠️ هشدار (${daysRemaining} روز باقیمانده)`;
  } else {
    return `✅ خوب (${daysRemaining} روز باقیمانده)`;
  }
};

// Handle /view_sims command
const handleViewSims = (bot, supabase) => async (msg) => {
  const chatId = msg.chat.id;

  try {
    // Send loading message
    const loadingMsg = await bot.sendMessage(chatId, "در حال لود کردن...");

    // Get all SIM cards from database
    const { data: sims, error } = await supabase
      .from("sims")
      .select("*")
      .order("number");

    if (error) throw error;

    if (!sims || sims.length === 0) {
      return bot.editMessageText("هیچ سیمکارتی ذخیره نشده.", {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
      });
    }

    // Create message with SIM cards info
    const now = moment();
    let message = "*📱 لیست سیم کارت ها*\n\n";

    sims.forEach((sim, index) => {
      const lastCharged = sim.last_charged ? moment(sim.last_charged) : null;
      const daysRemaining = lastCharged
        ? 90 - now.diff(lastCharged, "days")
        : "Never charged";

      message += `*${index + 1}. ${sim.number}* ${
        typeof daysRemaining === "number"
          ? formatDaysRemaining(daysRemaining)
          : daysRemaining
      }`;

      message += "\n";
    });

    // Edit the loading message with the SIM cards info
    bot.editMessageText(message, {
      chat_id: chatId,
      message_id: loadingMsg.message_id,
      parse_mode: "Markdown",
    });
  } catch (error) {
    console.error("Error fetching SIM cards:", error);
    bot.sendMessage(chatId, "بات دچار یک مشکل شده به علی بگید درستش کنه.");
  }
};

// Handle /mark_charged command
const handleMarkCharged = (bot, supabase) => async (msg) => {
  // Handle both direct messages and callback queries
  const chatId = msg.chat_id || (msg.chat ? msg.chat.id : null);
  
  if (!chatId) {
    console.error('Error: Chat ID not found in message object', msg);
    return;
  }
  
  // Extract page number from callback data if available
  const pageMatch = msg.data ? msg.data.match(/^page:(\d+)$/) : null;
  const page = pageMatch ? parseInt(pageMatch[1]) : 1;
  const itemsPerPage = 10; // Show 10 SIM cards per page

  try {
    // Get all SIM cards from database
    const { data: sims, error } = await supabase
      .from("sims")
      .select("*");

    if (error) throw error;

    if (!sims || sims.length === 0) {
      return bot.sendMessage(chatId, "هیچ سیمکارتی در دیتابیس نیست.");
    }

    // Calculate days remaining for each SIM and sort by days remaining (ascending)
    const now = moment();
    const simsWithDaysRemaining = sims.map(sim => {
      const lastCharged = sim.last_charged ? moment(sim.last_charged) : null;
      const daysRemaining = lastCharged
        ? 90 - now.diff(lastCharged, "days")
        : -999; // Put never charged SIMs at the top with a very negative value
      
      return {
        ...sim,
        daysRemaining: daysRemaining
      };
    });

    // Sort by days remaining (ascending - lowest days first)
    simsWithDaysRemaining.sort((a, b) => a.daysRemaining - b.daysRemaining);

    // Calculate total pages
    const totalPages = Math.ceil(simsWithDaysRemaining.length / itemsPerPage);
    
    // Get current page items
    const startIndex = (page - 1) * itemsPerPage;
    const currentPageSims = simsWithDaysRemaining.slice(startIndex, startIndex + itemsPerPage);

    // Create inline keyboard with SIM cards for current page
    const inlineKeyboard = [];

    currentPageSims.forEach((sim) => {
      const daysText = sim.daysRemaining === -999 
        ? "Never charged" 
        : `${sim.daysRemaining} روز باقیمانده`;
      
      inlineKeyboard.push([
        {
          text: `${sim.number} (${daysText})`,
          callback_data: `mark_charged:${sim.id}`,
        },
      ]);
    });

    // Add pagination controls if needed
    if (totalPages > 1) {
      const paginationRow = [];
      
      if (page > 1) {
        paginationRow.push({
          text: "« قبلی",
          callback_data: `page:${page - 1}`,
        });
      }
      
      paginationRow.push({
        text: `صفحه ${page} از ${totalPages}`,
        callback_data: "noop", // No operation
      });
      
      if (page < totalPages) {
        paginationRow.push({
          text: "بعدی »",
          callback_data: `page:${page + 1}`,
        });
      }
      
      inlineKeyboard.push(paginationRow);
    }

    // Prepare message text
    const messageText = "💰 *یک سیم کارت رو برای تغییر وضعیت انتخاب کنید:*\n" +
      "*با کلیک روی سیمکارت شماره شارژ میشود دقت کنید*\n" +
      `نمایش ${currentPageSims.length} سیم‌کارت از ${simsWithDaysRemaining.length} (مرتب شده بر اساس روزهای باقیمانده)`;

    // If this is from a callback query (pagination), edit the message
    if (msg.message && msg.data && msg.message.message_id) {
      bot.editMessageText(messageText, {
        chat_id: chatId,
        message_id: msg.message.message_id,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: inlineKeyboard,
        },
      });
    } else {
      // Otherwise send a new message
      bot.sendMessage(
        chatId,
        messageText,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: inlineKeyboard,
          },
        }
      );
    }
  } catch (error) {
    console.error("Error fetching SIM cards for marking:", error);
    bot.sendMessage(chatId, "مشکل برام پیش امده کسگم به علی بگین درستم کنه");
  }
};

// Handle /view_reminders command
const handleViewReminders = (bot, supabase, reminderDays) => async (msg) => {
  const chatId = msg.chat.id;

  try {
    // Send loading message
    const loadingMsg = await bot.sendMessage(
      chatId,
      "در حال بررسی سیمکارت ها..."
    );

    // Get all SIM cards from database
    const { data: sims, error } = await supabase
      .from("sims")
      .select("*")
      .order("number");

    if (error) throw error;

    if (!sims || sims.length === 0) {
      return bot.editMessageText("هیچ سیمکارتی در دیتابیس نیست.", {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
      });
    }

    // Filter SIM cards that need charging
    const now = moment();
    const dueSims = sims.filter((sim) => {
      if (!sim.last_charged) return true;

      const lastCharged = moment(sim.last_charged);
      const daysSinceCharge = now.diff(lastCharged, "days");
      const daysRemaining = reminderDays - daysSinceCharge;

      // Show SIMs that have passed the reminder threshold OR are in critical state (less than 30 days remaining)
      return (
        daysSinceCharge >= reminderDays ||
        (daysRemaining > 0 && daysRemaining <= 30)
      );
    });

    if (dueSims.length === 0) {
      return bot.editMessageText("✅ هیچ سیمکارتی نیازمند شارژ نیست.", {
        chat_id: chatId,
        message_id: loadingMsg.message_id,
      });
    }

    // Create message with due SIM cards
    let message = `⚠️ *${dueSims.length} سیم کارت های نیازمند شارژ:*\n\n`;

    dueSims.forEach((sim, index) => {
      const lastCharged = sim.last_charged ? moment(sim.last_charged) : null;
      const daysSinceCharge = lastCharged
        ? now.diff(lastCharged, "days")
        : "Never charged";
      const daysRemaining = lastCharged
        ? reminderDays - daysSinceCharge
        : "N/A";

      message += `*${index + 1}. ${sim.number}*\n`;
      message += `روز گذشته از شارژ: ${daysSinceCharge}\n`;
      message += `روز باقیمانده: ${
        typeof daysRemaining === "number" ? daysRemaining : daysRemaining
      }\n`;
      if (sim.charged_by) {
        message += `آخرین شارژ توسط: ${sim.charged_by}\n`;
      }
      message += "\n";
    });

    // Add inline keyboard to mark SIMs as charged
    const inlineKeyboard = dueSims.map((sim) => [
      {
        text: `تغییر وضعیت ${sim.number} به شارژ شده؟ (کلیک)`,
        callback_data: `mark_charged:${sim.id}`,
      },
    ]);

    // Edit the loading message with the due SIM cards info
    bot.editMessageText(message, {
      chat_id: chatId,
      message_id: loadingMsg.message_id,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: inlineKeyboard,
      },
    });
  } catch (error) {
    console.error("Error checking for due SIM cards:", error);
    bot.sendMessage(chatId, "مشکل برام پیش امده به علی بگین درستم کنه.");
  }
};

module.exports = {
  handleViewSims,
  handleMarkCharged,
  handleViewReminders,
};

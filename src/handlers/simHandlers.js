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
        ? 180 - now.diff(lastCharged, "days")
        : "Never charged";

      message += `*${index + 1}. ${sim.number}*\n`;
      message += `آخرین شارژ: ${
        lastCharged ? lastCharged.format("YYYY-MM-DD") : "Never"
      }\n`;
      message += `وضعیت: ${
        typeof daysRemaining === "number"
          ? formatDaysRemaining(daysRemaining)
          : daysRemaining
      }\n`;
      if (sim.charged_by) {
        message += `آخرین شارژ توسط: ${sim.charged_by}\n`;
      }
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
  const chatId = msg.chat.id;

  try {
    // Get all SIM cards from database
    const { data: sims, error } = await supabase
      .from("sims")
      .select("*")
      .order("number");

    if (error) throw error;

    if (!sims || sims.length === 0) {
      return bot.sendMessage(chatId, "هیچ سیمکارتی در دیتابیس نیست.");
    }

    // Create inline keyboard with SIM cards
    const inlineKeyboard = [];
    const now = moment();

    sims.forEach((sim) => {
      const lastCharged = sim.last_charged ? moment(sim.last_charged) : null;
      const daysRemaining = lastCharged
        ? 180 - now.diff(lastCharged, "days")
        : "Never";

      inlineKeyboard.push([
        {
          text: `${sim.number} (${
            typeof daysRemaining === "number"
              ? daysRemaining + " روزهای باقیمانده"
              : daysRemaining
          })`,
          callback_data: `mark_charged:${sim.id}`,
        },
      ]);
    });

    // Send message with inline keyboard
    bot.sendMessage(
      chatId,
      "💰 *یک سیم کارت رو برای تغییر وضعیت انتخاب کنید:*",
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: inlineKeyboard,
        },
      }
    );
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

      return daysSinceCharge >= reminderDays;
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
      const daysRemaining = lastCharged ? 180 - daysSinceCharge : "N/A";

      message += `*${index + 1}. ${sim.number}*\n`;
      message += `آخرین شارژ: ${
        lastCharged ? lastCharged.format("YYYY-MM-DD") : "Never"
      }\n`;
      message += `روز گذشته از شارژ: ${daysSinceCharge}\n`;
      message += `روز باقیمانده: ${
        typeof daysRemaining === "number" ? daysRemaining : daysRemaining
      }\n`;
      if (sim.charged_by) {
        message += `Last charged by: ${sim.charged_by}\n`;
      }
      message += "\n";
    });

    // Add inline keyboard to mark SIMs as charged
    const inlineKeyboard = dueSims.map((sim) => [
      {
        text: `وضعیت ${sim.number} به شارژ شده تغییر یافت`,
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

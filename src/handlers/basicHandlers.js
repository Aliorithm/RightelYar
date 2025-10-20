/**
 * Basic command handlers for the Telegram bot
 */

// Handle /start command
const handleStart = (bot) => (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name;

  const message = `سلام ${firstName}!

این بات کمک میکنه سیم کارت ها رو مدیریت کنیم تا مسدود نشن

دستور ها:
/viewsims - دیدن همه سیم کارت ها و وضعیتشون
/markcharged - علامت گذاری سیم کارت به عنوان شارژ شده
/viewreminders - دیدن سیم کارت هایی که شارژ نشده اند
/addsim - اضافه کردن سیم کارت جدید به دیتابیس
/help - دیدن این راهنما`;

  bot.sendMessage(chatId, message, {
    parse_mode: "Markdown",
    reply_markup: {
      keyboard: [
        ["📱 View SIM Cards", "💰 Mark as Charged"],
        ["❓ Help", "➕ Add SIM Card"],
        ["⏰ View Reminders"],
      ],
      resize_keyboard: true,
    },
  });
};

// Handle /help command
const handleHelp = (bot) => (msg) => {
  const chatId = msg.chat.id;

  const message = `*RightelYar Bot Help*

این بات کمک میکنه سیم کارت ها رو مدیریت کنیم تا مسدود نشن

دستور ها:
/viewsims - دیدن همه سیم کارت ها و وضعیتشون
/markcharged - علامت گذاری سیم کارت به عنوان شارژ شده
/viewreminders - دیدن سیم کارت هایی که شارژ نشده اند
/addsim - اضافه کردن سیم کارت جدید به دیتابیس
/help - دیدن این راهنما

همینطور میتونی از منو کیبوردی استفاده کنی.`;

  bot.sendMessage(chatId, message, {
    parse_mode: "Markdown",
  });
};

module.exports = {
  handleStart,
  handleHelp,
};

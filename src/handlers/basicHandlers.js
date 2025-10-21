/**
 * Basic command handlers for the Telegram bot
 */

// Handle /start command
const handleStart = (bot) => (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name;

  const message = `سلام ${firstName}!

این بات کمک میکنه سیم کارت ها رو مدیریت کنیم تا مسدود نشن\n
اگه منو رو نمیبینی /start بزن

دستور ها:
/viewsims - وضعیت همه سیم کارت ها
/markcharged - تغییر وضعیت سیم ها
/viewreminders - دیدن سیم های نیازمند شارژ
/addsim - سیم کارت جدید
/help - دیدن راهنما`;

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

برای جلوگیری از مسدود شدن سیم کارت ها لازمه هر *سه ماه* دو هزار تومن شارژ برای خط ها بخریم
\n از سایت زیر میتونین 2 هزار تومن مستقیم بخرین و تستش کردم
https://e-khadamat.ir/Topup/18/شارژ-2-هزار-تومانی-رایتل\n
میخوام همیشه از دکمه *⏰ View Reminders* استفاده کنید
اگه وضعیت سیمکارت ها بحرانی شد اونجا بهتون میگه کدوم رو شارژ کنید
هرچند هر سیم کارت که ۳۰ روز آخرش باشه به صورت خودکار بهتون میگه`;

  bot.sendMessage(chatId, message, {
    parse_mode: "Markdown",
  });
};

module.exports = {
  handleStart,
  handleHelp,
};

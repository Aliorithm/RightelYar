/**
 * Reminder handler for the Telegram bot
 */
const moment = require("moment");

// Check for SIM cards that need charging and send reminders
const checkAndSendReminders = (bot, supabase, adminIds, reminderDays) => {
  return async () => {
    try {
      console.log("Running daily reminder check...");

      // Get all SIM cards
      const { data: sims, error } = await supabase.from("sims").select("*");

      if (error) {
        console.error("Error fetching SIMs:", error);
        return;
      }

      // Filter SIMs that need charging
      const now = moment();
      const simsNeedingCharge = sims.filter((sim) => {
        if (!sim.last_charged) return true;

        const lastCharged = moment(sim.last_charged);
        const daysSinceCharge = now.diff(lastCharged, "days");
        const daysRemaining = reminderDays - daysSinceCharge;

        // Show SIMs that have passed the reminder threshold OR are in critical state (less than 30 days remaining)
        return daysSinceCharge >= reminderDays || (daysRemaining > 0 && daysRemaining <= 30);
      });

      if (simsNeedingCharge.length === 0) {
        console.log("No SIMs need charging at this time.");
        return;
      }

      // Construct reminder message
      let message = "⚠️ *یادآوری: سیم کارت ها نیازمند شارژند* ⚠️\n\n";

      simsNeedingCharge.forEach((sim) => {
        const lastCharged = sim.last_charged ? moment(sim.last_charged) : null;
        const daysSinceCharge = lastCharged
          ? now.diff(lastCharged, "days")
          : "Never";
        const daysRemaining = lastCharged
          ? reminderDays - now.diff(lastCharged, "days")
          : 0;

        message += `📱 *${sim.number}*\n`;
        message += `آخرین شارژ: ${
          lastCharged ? lastCharged.format("YYYY-MM-DD") : "Never"
        }\n`;
        message += `روز گذشته از شارژ: ${daysSinceCharge}\n`;
        message += `روز باقیمانده: ${
          daysRemaining <= 0 ? "⚠️ OVERDUE" : daysRemaining
        }\n\n`;
      });

      message += "از /markcharged برای تغییر وضعیت سیم استفاده کنید.";

      // Send reminder to all admins
      for (const adminId of adminIds) {
        bot.sendMessage(adminId, message, { parse_mode: "Markdown" });
      }

      // Broadcast warning to all admins if any SIM is close to expiration (less than 30 days remaining)
      const criticalSims = simsNeedingCharge.filter((sim) => {
        if (!sim.last_charged) return true;
        const lastCharged = moment(sim.last_charged);
        const daysRemaining = reminderDays - now.diff(lastCharged, "days");
        return daysRemaining <= 30 && daysRemaining > 0;
      });

      if (criticalSims.length > 0) {
        let warningMessage = "🚨 *اخطار: وضعیت اظطراری شارژ* 🚨\n\n";
        warningMessage +=
          "سیم کارت های زیر نزدیک به مسدود شدنن و نیازمند شارژ سریع اند:\n\n";

        criticalSims.forEach((sim) => {
          const lastCharged = moment(sim.last_charged);
          const daysRemaining = reminderDays - now.diff(lastCharged, "days");

          warningMessage += `📱 *${sim.number}*\n`;
          warningMessage += `روز باقیمانده: *${daysRemaining}*\n\n`;
        });

        warningMessage += "لطفا یکیتون هرچه زودتر شارژش کنه!";

        // Send warning to all admins
        for (const adminId of adminIds) {
          bot.sendMessage(adminId, warningMessage, { parse_mode: "Markdown" });
        }

        console.log(
          `Sent critical warnings for ${criticalSims.length} SIMs to ${adminIds.length} admins.`
        );
      }

      console.log(
        `Sent reminders for ${simsNeedingCharge.length} SIMs to ${adminIds.length} admins.`
      );
    } catch (error) {
      console.error("Error in reminder check:", error);
    }
  };
};

module.exports = {
  checkAndSendReminders,
};

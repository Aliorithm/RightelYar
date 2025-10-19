/**
 * Reminder handler for the Telegram bot
 */
const moment = require('moment');

// Check for SIM cards that need charging and send reminders
const checkAndSendReminders = (bot, supabase, adminIds, reminderDays) => {
  return async () => {
    try {
      console.log('Running daily reminder check...');
      
      // Get all SIM cards
      const { data: sims, error } = await supabase
        .from('sims')
        .select('*');
      
      if (error) {
        console.error('Error fetching SIMs:', error);
        return;
      }
      
      // Filter SIMs that need charging
      const now = moment();
      const simsNeedingCharge = sims.filter(sim => {
        if (!sim.last_charged) return true;
        
        const lastCharged = moment(sim.last_charged);
        const daysSinceCharge = now.diff(lastCharged, 'days');
        
        return daysSinceCharge >= reminderDays;
      });
      
      if (simsNeedingCharge.length === 0) {
        console.log('No SIMs need charging at this time.');
        return;
      }
      
      // Construct reminder message
      let message = '⚠️ *REMINDER: SIM Cards Due for Charging* ⚠️\n\n';
      
      simsNeedingCharge.forEach(sim => {
        const lastCharged = sim.last_charged ? moment(sim.last_charged) : null;
        const daysSinceCharge = lastCharged ? now.diff(lastCharged, 'days') : 'Never';
        const daysRemaining = lastCharged ? 180 - now.diff(lastCharged, 'days') : 0;
        
        message += `📱 *${sim.number}*\n`;
        message += `Last Charged: ${lastCharged ? lastCharged.format('YYYY-MM-DD') : 'Never'}\n`;
        message += `Days Since Charge: ${daysSinceCharge}\n`;
        message += `Days Remaining: ${daysRemaining <= 0 ? '⚠️ OVERDUE' : daysRemaining}\n\n`;
      });
      
      message += 'Use /markcharged to update the charging status.';
      
      // Send reminder to all admins
      for (const adminId of adminIds) {
        bot.sendMessage(adminId, message, { parse_mode: 'Markdown' });
      }
      
      // Broadcast warning to all admins if any SIM is close to expiration (less than 30 days remaining)
      const criticalSims = simsNeedingCharge.filter(sim => {
        if (!sim.last_charged) return true;
        const lastCharged = moment(sim.last_charged);
        const daysRemaining = 180 - now.diff(lastCharged, 'days');
        return daysRemaining <= 30 && daysRemaining > 0;
      });
      
      if (criticalSims.length > 0) {
        let warningMessage = '🚨 *URGENT: SIM Cards Critical Warning* 🚨\n\n';
        warningMessage += 'The following SIM cards are close to expiration and need immediate attention:\n\n';
        
        criticalSims.forEach(sim => {
          const lastCharged = moment(sim.last_charged);
          const daysRemaining = 180 - now.diff(lastCharged, 'days');
          
          warningMessage += `📱 *${sim.number}*\n`;
          warningMessage += `Days Remaining: *${daysRemaining}*\n\n`;
        });
        
        warningMessage += 'Please charge these SIM cards as soon as possible!';
        
        // Send warning to all admins
        for (const adminId of adminIds) {
          bot.sendMessage(adminId, warningMessage, { parse_mode: 'Markdown' });
        }
        
        console.log(`Sent critical warnings for ${criticalSims.length} SIMs to ${adminIds.length} admins.`);
      }
      
      console.log(`Sent reminders for ${simsNeedingCharge.length} SIMs to ${adminIds.length} admins.`);
    } catch (error) {
      console.error('Error in reminder check:', error);
    }
  };
};

module.exports = {
  checkAndSendReminders
};
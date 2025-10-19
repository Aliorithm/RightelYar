# RightelYar - Telegram Bot for SIM Card Charging Reminders

A Telegram bot that helps you manage and track Rightel SIM cards charging schedules. The bot allows multiple administrators to view SIM cards, mark them as charged, and receive reminders when SIM cards need to be charged.

## Features

- View all SIM cards and their charging status
- Mark SIM cards as charged (tracks who charged)
- Receive reminders for SIM cards that need charging (after `REMINDER_DAYS`)
- Admin-only access
- Express endpoints for health check and cron trigger on Render

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- Telegram Bot Token (from BotFather)
- Supabase account

### Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file based on `.env.example`:
   ```
   cp .env.example .env
   ```
4. Fill in your environment variables in the `.env` file:
   - `TELEGRAM_BOT_TOKEN`: Your Telegram bot token from BotFather
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_KEY`: Your Supabase service role key
   - `ADMIN_TELEGRAM_IDS`: Comma-separated list of admin Telegram IDs
   - `REMINDER_DAYS`: Days threshold for reminders (default: 150)

### Database Setup

1. Create a new Supabase project
2. Run the SQL queries in `supabase_schema.sql` in the Supabase SQL editor
3. Add your SIM cards to the `sims` table:
   ```sql
   INSERT INTO sims (number) VALUES ('0921-951-XXXX');
   ```

### Running the Bot

Development mode:

```
npm run dev
```

Production mode:

```
npm start
```

## Deployment

### Deploying to Render

1. Create a new `Web Service` on Render (Node runtime)
2. Connect your GitHub repository
3. Set the build command: `npm install`
4. Set the start command: `npm start`
5. Add environment variables from your `.env` file
6. Deploy the service

#### Service endpoints
- `GET /healthz` returns `{ status: 'ok' }` and current time
- `GET /cron/check` triggers the reminder/broadcast check immediately

#### Keep-alive and scheduled reminders
- On free plans, Render may spin down after inactivity. Use an external pinger (e.g., UptimeRobot) to hit `https://<your-service>.onrender.com/healthz` every 10–14 minutes to keep it warm.
- To ensure reminders run regularly, set a pinger to call `https://<your-service>.onrender.com/cron/check` at your preferred schedule (e.g., daily at 09:00). The app also runs a cron internally at 09:00 Asia/Tehran.

Render automatically provides a `PORT` environment variable; the server binds to it when present.

## Bot Commands

- `/start` - Start the bot and show the main menu
- `/help` - Show help information
- `/viewsims` - View all SIM cards and their status
- `/markcharged` - Mark a SIM card as charged
- `/viewreminders` - View SIM cards due for charging
- `/addsim` - Add a SIM card

## Flow Diagram

See `flow_diagram.md` for a visual representation of the bot's functionality.

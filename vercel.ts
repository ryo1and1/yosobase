const cronSecret = process.env.CRON_SECRET;

const productionCrons = cronSecret
  ? [
      {
        path: `/api/cron/daily-maintenance?secret=${encodeURIComponent(cronSecret)}`,
        schedule: "30 14 * * *"
      }
    ]
  : [];

export const config = {
  crons: process.env.VERCEL_ENV === "production" ? productionCrons : []
};

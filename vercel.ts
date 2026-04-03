export const config = {
  // Vercel cron definitions should be static so they are always emitted into
  // the production deployment output. Authentication is handled by CRON_SECRET
  // via the Authorization header on Vercel's side.
  crons: [
    {
      path: "/api/cron/daily-maintenance",
      schedule: "30 14 * * *"
    }
  ]
};

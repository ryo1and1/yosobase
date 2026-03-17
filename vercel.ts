const productionCrons = [
  {
    path: "/api/cron/daily-maintenance",
    schedule: "30 14 * * *"
  }
];

export const config = {
  crons: process.env.VERCEL_ENV === "production" ? productionCrons : []
};

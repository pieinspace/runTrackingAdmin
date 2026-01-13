import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const dbHealthcheck = async () => {
  await pool.query("SELECT 1");
  console.log("✅ Database connected");
};

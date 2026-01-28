
import dotenv from "dotenv";
dotenv.config();
import { pool } from "./src/db";

const migrate = async () => {
    try {
        await pool.query(
            "ALTER TABLE run_sessions ADD COLUMN IF NOT EXISTS validation_status VARCHAR(20) DEFAULT 'pending'"
        );
        console.log("✅ Added validation_status to run_sessions");
    } catch (err) {
        console.error("❌ Migration failed:", err);
    } finally {
        process.exit();
    }
};

migrate();


import dotenv from "dotenv";
dotenv.config();
import { pool } from "./src/db";

const inspect = async () => {
    try {
        const usersCols = await pool.query(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'"
        );
        console.log("USERS TABLE:", usersCols.rows);

        const matchCols = await pool.query(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'run_sessions'"
        );
        console.log("RUN_SESSIONS TABLE:", matchCols.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
};

inspect();

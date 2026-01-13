import { Request, Response } from "express";
import { pool } from "../db";

export const getRunners = async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        name,
        rank,
        status,
        total_distance AS "totalDistance",
        total_sessions AS "totalSessions",
        created_at AS "createdAt"
      FROM runners
      ORDER BY id ASC
    `);

    res.json({ data: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "DB error" });
  }
};

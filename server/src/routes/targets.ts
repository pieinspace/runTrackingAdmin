import { Router } from "express";
import { pool } from "../db";

const router = Router();

/**
 * GET /api/targets/14km
 * Data untuk halaman Target 14 KM dan tabel dashboard "Target 14 KM Tercapai"
 */
router.get("/14km", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        rs.id AS id,
        u.name,
        u.pangkat AS rank,
        rs.distance_km,
        rs.duration_sec,
        rs.date_created AS achieved_date,
        rs.validation_status,
        u.kesatuan
      FROM run_sessions rs
      JOIN users u ON u.id = rs.user_id
      WHERE rs.distance_km >= 14
      ORDER BY rs.date_created DESC
    `);

    // Transform data to match frontend expectations
    const data = result.rows.map((row) => {
      // Calculate time_taken (HH:MM:SS)
      const duration = row.duration_sec || 0;
      const hours = Math.floor(duration / 3600);
      const minutes = Math.floor((duration % 3600) / 60);
      const seconds = duration % 60;
      const time_taken = `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

      // Calculate pace (min/km)
      const distance = row.distance_km || 1;
      const paceVal = duration / 60 / distance;
      const paceMin = Math.floor(paceVal);
      const paceSec = Math.round((paceVal - paceMin) * 60);
      const pace = `${paceMin}'${paceSec.toString().padStart(2, "0")}"/km`;

      return {
        ...row,
        // Frontend expects these fields
        time_taken,
        pace,
        subdis: null, // subdis not available in users table
      };
    });

    res.json({ data });
  } catch (err) {
    console.error("GET /api/targets/14km error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * POST /api/targets/14km/validate/:id
 * Toggles or sets validation_status to 'validated'
 */
router.post("/14km/validate/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // Validasi run_session instead of target_14km
    const result = await pool.query(
      "UPDATE run_sessions SET validation_status = 'validated' WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Target record not found" });
    }

    res.json({ data: result.rows[0] });
  } catch (err) {
    console.error("POST /api/targets/14km/validate/:id error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;

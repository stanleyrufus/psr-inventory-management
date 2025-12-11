import express from "express";
import { db } from "../db.js";
import os from "os";

const router = express.Router();

// Track server startup time
const serverStartedAt = Date.now();

// Helper
function safeCount(val) {
  return Number(val?.count || 0);
}

function levelFromCounts({ critical, warning }) {
  if (critical > 0) return "critical";
  if (warning > 0) return "warning";
  return "ok";
}

router.get("/overview", async (req, res) => {
  try {
    // ------------------------------------------------------------------
    // 1️⃣ SYSTEM HEALTH
    // ------------------------------------------------------------------

    // DB HEALTH + LATENCY + SLOW QUERY CHECK
    let dbStatus = "ok";
    let dbLatencyMs = null;
    let dbSlow = false;

    try {
      const t0 = Date.now();
      await db.raw("SELECT 1");
      dbLatencyMs = Date.now() - t0;
      if (dbLatencyMs > 200) dbSlow = true; // mark slow DB
    } catch {
      dbStatus = "down";
    }

    // API HEALTH
    const apiStatus = "ok";

    // NODE PROCESS METRICS
    const nodeCpu = os.loadavg()[0]; // 1 min load avg
    const nodeMemory = Math.round((process.memoryUsage().rss / 1024 / 1024) * 10) / 10;
    const uptimeSeconds = Math.floor((Date.now() - serverStartedAt) / 1000);

    // ------------------------------------------------------------------
    // 2️⃣ BUSINESS LOGIC (SAFE)
    // ------------------------------------------------------------------

    let lowStockParts = [];
    let lowStockCount = 0;

    try {
      lowStockParts = await db("parts")
        .whereNotNull("reorder_level")
        .andWhere("reorder_level", ">", 0)
        .andWhere("quantity_on_hand", "<", db.ref("reorder_level"))
        .limit(5);

      const r = await db("parts")
        .whereNotNull("reorder_level")
        .andWhere("reorder_level", ">", 0)
        .andWhere("quantity_on_hand", "<", db.ref("reorder_level"))
        .count({ count: "*" });

      lowStockCount = safeCount(r[0]);
    } catch {}

    const pendingStatuses = ["Draft", "Submitted", "Awaiting Approval"];
    let pendingPoCount = 0;
    let stalePoCount = 0;
    let inactiveVendorsCount = 0;

    try {
      pendingPoCount = safeCount(
        (await db("purchase_orders")
          .whereIn("status", pendingStatuses)
          .count({ count: "*" }))[0]
      );
    } catch {}

    try {
      stalePoCount = safeCount(
        (await db("purchase_orders")
          .whereIn("status", pendingStatuses)
          .andWhereRaw(
            `COALESCE(updated_at, created_at, created_date, NOW()) < NOW() - INTERVAL '7 days'`
          )
          .count({ count: "*" }))[0]
      );
    } catch {}

    try {
      inactiveVendorsCount = safeCount(
        (await db("vendors")
          .andWhereRaw(
            `COALESCE(updated_at, created_at, NOW()) < NOW() - INTERVAL '6 months'`
          )
          .count({ count: "*" }))[0]
      );
    } catch {}

    // ------------------------------------------------------------------
    // 3️⃣ STATUS LEVELS
    // ------------------------------------------------------------------

    const businessCritical = lowStockCount > 0 || stalePoCount > 0;
    const businessWarning = pendingPoCount > 0 || inactiveVendorsCount > 0;

    const businessLevel = levelFromCounts({
      critical: businessCritical ? 1 : 0,
      warning: businessWarning ? 1 : 0,
    });

    // ------------------------------------------------------------------
    // 4️⃣ BUSINESS ALERTS
    // ------------------------------------------------------------------

    const businessAlerts = [];
    if (lowStockCount > 0)
      businessAlerts.push(`${lowStockCount} part(s) below minimum stock.`);
    if (pendingPoCount > 0)
      businessAlerts.push(`${pendingPoCount} pending PO(s).`);
    if (stalePoCount > 0)
      businessAlerts.push(`${stalePoCount} stale PO(s).`);
    if (inactiveVendorsCount > 0)
      businessAlerts.push(`${inactiveVendorsCount} inactive vendor(s).`);

    if (businessAlerts.length === 0)
      businessAlerts.push("Everything looks good.");

    // ------------------------------------------------------------------
    // 5️⃣ NGINX MONITORING (request logs)
    // ------------------------------------------------------------------

    let nginxStats = {
      recentRequests: 0,
      status4xx: 0,
      status5xx: 0,
    };

    try {
      const rows = await db.raw(
        `
        SELECT 
          COUNT(*) FILTER (WHERE status BETWEEN 400 AND 499) AS s4xx,
          COUNT(*) FILTER (WHERE status BETWEEN 500 AND 599) AS s5xx,
          COUNT(*) AS total
        FROM nginx_logs
        WHERE timestamp > NOW() - INTERVAL '1 minute'
      `
      );
      nginxStats = {
        recentRequests: Number(rows.rows[0].total || 0),
        status4xx: Number(rows.rows[0].s4xx || 0),
        status5xx: Number(rows.rows[0].s5xx || 0),
      };
    } catch {
      // If nginx logs table doesn't exist, ignore
    }

    // ------------------------------------------------------------------
    // 6️⃣ FINAL RETURN
    // ------------------------------------------------------------------

    res.json({
      generatedAt: new Date().toISOString(),

      system: {
        level: dbStatus === "down" ? "critical" : dbSlow ? "warning" : "ok",
        apiStatus,
        dbStatus,
        dbLatencyMs,
        nodeCpu,
        nodeMemory,
        uptimeSeconds,
        nginx: nginxStats,
      },

      business: {
        level: businessLevel,
        lowStockCount,
        pendingPoCount,
        stalePoCount,
        inactiveVendorsCount,
        lowStockParts,
        messages: businessAlerts,
      },
    });
  } catch (err) {
    console.error("MONITORING ERROR:", err);
    res.status(500).json({ error: "Monitoring failure" });
  }
});

export default router;

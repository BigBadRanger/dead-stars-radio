import { Router } from "express";
import { db } from "@workspace/db";
import { starsTable } from "@workspace/db";

const router = Router();

router.get("/stats", async (req, res) => {
  try {
    const stars = await db.select().from(starsTable);
    const deadStars = stars.filter(s => !s.isAlive);
    const aliveStars = stars.filter(s => s.isAlive);

    const spectralBreakdown: Record<string, number> = {};
    for (const star of stars) {
      spectralBreakdown[star.spectralClass] = (spectralBreakdown[star.spectralClass] || 0) + 1;
    }

    const avgTransmissionAge = stars.reduce((sum, s) => sum + s.transmissionAgeYears, 0) / stars.length;
    const farthestStar = stars.reduce((max, s) => s.distanceLightYears > max.distanceLightYears ? s : max, stars[0]);

    res.json({
      totalStars: stars.length,
      deadStars: deadStars.length,
      aliveStars: aliveStars.length,
      spectralBreakdown,
      avgTransmissionAge,
      farthestStar,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get stats");
    res.status(500).json({ error: "Failed to get stats" });
  }
});

export default router;

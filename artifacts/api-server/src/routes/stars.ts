import { Router } from "express";
import { db } from "@workspace/db";
import { starsTable, lightCurvePointsTable } from "@workspace/db";
import { eq, ilike, or } from "drizzle-orm";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router = Router();

// GET /stars — list all curated stars with optional filters
router.get("/", async (req, res) => {
  try {
    let query = db.select().from(starsTable);
    const stars = await query;
    
    let filtered = stars;
    if (req.query.spectralClass) {
      filtered = filtered.filter(s => s.spectralClass === req.query.spectralClass);
    }
    if (req.query.isAlive !== undefined) {
      const isAlive = req.query.isAlive === "true";
      filtered = filtered.filter(s => s.isAlive === isAlive);
    }
    
    res.json(filtered);
  } catch (err) {
    req.log.error({ err }, "Failed to list stars");
    res.status(500).json({ error: "Failed to list stars" });
  }
});

// GET /stars/featured — random curated star
router.get("/featured", async (req, res) => {
  try {
    const stars = await db.select().from(starsTable);
    const famous = stars.filter(s => s.distanceLightYears > 100);
    const pick = famous.length > 0 
      ? famous[Math.floor(Math.random() * famous.length)]
      : stars[Math.floor(Math.random() * stars.length)];
    res.json(pick);
  } catch (err) {
    req.log.error({ err }, "Failed to get featured star");
    res.status(500).json({ error: "Failed to get featured star" });
  }
});

// GET /stars/search — search via NASA Exoplanet Archive + local
router.get("/search", async (req, res) => {
  const q = (req.query.q as string) || "";
  if (!q.trim()) return res.json([]);

  try {
    // Search local DB first
    const local = await db.select().from(starsTable).where(
      or(
        ilike(starsTable.name, `%${q}%`),
        ilike(starsTable.commonName, `%${q}%`)
      )
    );

    // Also query NASA Exoplanet Archive
    const nasaUrl = `https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=select+top+5+hostname,st_spectype,st_teff,st_mass,st_rad,st_lum,sy_dist,st_age+from+stellarhosts+where+hostname+like+%27%25${encodeURIComponent(q)}%25%27&format=json`;
    
    let nasaResults: typeof local = [];
    try {
      const nasaResp = await fetch(nasaUrl, { signal: AbortSignal.timeout(5000) });
      if (nasaResp.ok) {
        const data: Array<{
          hostname?: string;
          st_spectype?: string;
          st_teff?: number;
          st_mass?: number;
          st_rad?: number;
          st_lum?: number;
          sy_dist?: number;
        }> = await nasaResp.json();
        
        nasaResults = data
          .filter((d) => d.hostname && !local.find(l => l.name.toLowerCase() === (d.hostname || '').toLowerCase()))
          .map((d, i) => ({
            id: -1000 - i,
            name: d.hostname || "Unknown",
            commonName: null,
            spectralClass: d.st_spectype?.charAt(0) || "G",
            subtype: d.st_spectype || null,
            temperature: d.st_teff || null,
            massSolar: d.st_mass || null,
            radiusSolar: d.st_rad || null,
            luminositySolar: d.st_lum || null,
            distanceLightYears: (d.sy_dist || 100) * 3.26156,
            isAlive: true,
            transmissionAgeYears: (d.sy_dist || 100) * 3.26156,
            deathYear: null,
            constellation: null,
            nasaId: d.hostname || null,
            imageUrl: null,
            generatedImageUrl: null,
            description: `${d.hostname || "Unknown"} is a ${d.st_spectype || "star"} located approximately ${Math.round((d.sy_dist || 100) * 3.26156)} light-years away.`,
            sonificationParams: buildSonificationParams(d.st_spectype?.charAt(0) || "G", d.st_teff || 5778, null),
          }));
      }
    } catch (_) {
      // NASA API failed, fall back to local only
    }

    res.json([...local, ...nasaResults]);
  } catch (err) {
    req.log.error({ err }, "Failed to search stars");
    res.status(500).json({ error: "Failed to search stars" });
  }
});

// GET /stars/stats — aggregate catalog stats
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

// GET /stars/:id — single star
router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const [star] = await db.select().from(starsTable).where(eq(starsTable.id, id));
    if (!star) return res.status(404).json({ error: "Not found" });
    res.json(star);
  } catch (err) {
    req.log.error({ err }, "Failed to get star");
    res.status(500).json({ error: "Failed to get star" });
  }
});

// GET /stars/:id/lightcurve — light curve data
router.get("/:id/lightcurve", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const [star] = await db.select().from(starsTable).where(eq(starsTable.id, id));
    if (!star) return res.status(404).json({ error: "Not found" });

    const dbPoints = await db.select()
      .from(lightCurvePointsTable)
      .where(eq(lightCurvePointsTable.starId, id))
      .limit(500);

    const points = dbPoints.length > 0 
      ? dbPoints.map(p => ({ time: p.time, flux: p.flux }))
      : generateSyntheticLightCurve(star.spectralClass, star.sonificationParams?.pulseRate);

    res.json({
      starId: id,
      points,
      source: dbPoints.length > 0 ? "curated" : "synthetic",
      period: star.sonificationParams?.pulseRate ? (60 / star.sonificationParams.pulseRate) : null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get light curve");
    res.status(500).json({ error: "Failed to get light curve" });
  }
});

// GET /stars/:id/imagery — star imagery
router.get("/:id/imagery", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const [star] = await db.select().from(starsTable).where(eq(starsTable.id, id));
    if (!star) return res.status(404).json({ error: "Not found" });

    res.json({
      starId: id,
      visibleLight: star.imageUrl,
      infrared: null,
      xray: null,
      generated: star.generatedImageUrl,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get imagery");
    res.status(500).json({ error: "Failed to get imagery" });
  }
});

// POST /stars/:id/narration — stream AI narration via SSE
router.post("/:id/narration", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const [star] = await db.select().from(starsTable).where(eq(starsTable.id, id));
    if (!star) return res.status(404).json({ error: "Not found" });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders(); // push headers immediately so proxies open the stream

    const transmissionAge = Math.round(star.transmissionAgeYears);
    const spectralDesc: Record<string, string> = {
      O: "an intensely hot blue O-class giant burning at over 30,000 Kelvin",
      B: "a hot blue-white B-class star blazing at 10,000 to 30,000 Kelvin",
      A: "a white A-class star glowing at 7,500 to 10,000 Kelvin",
      F: "a yellow-white F-class star at 6,000 to 7,500 Kelvin",
      G: "a yellow G-class star like our own Sun, burning at 5,200 to 6,000 Kelvin",
      K: "a cool orange K-class star at 3,700 to 5,200 Kelvin",
      M: "a cool red M-class dwarf glowing at under 3,700 Kelvin",
    };
    const spectralNote = spectralDesc[star.spectralClass] || "a star of unknown classification";

    const systemPrompt = `You are Carl Sagan narrating a deep space radio broadcast. Your voice is precise but filled with wonder. You describe stars as the cosmic entities they truly are — ancient, vast, indifferent, and beautiful.

Keep your narration to 4-6 paragraphs. Each paragraph should feel like a transmission arriving from deep space — measured, deliberate, profound.

Focus on:
1. What the listener is hearing and why it sounds this way
2. The star's life story and physical nature
3. The transmission lag — the fact that this signal is ${transmissionAge} years old
4. Whether the star still exists, and what that means
5. The cosmic scale of time

Do not use emojis. Do not use informal language. Speak with the authority and wonder of someone who genuinely loves the cosmos.`;

    const userPrompt = `Generate a narration for ${star.name}${star.commonName ? ` (also known as ${star.commonName})` : ""}.

Star data:
- Name: ${star.name}
- Spectral class: ${star.spectralClass} — ${spectralNote}
- Distance: ${Math.round(star.distanceLightYears)} light-years from Earth
- Transmission age: This signal left ${transmissionAge} years ago
- Still exists: ${star.isAlive ? "Yes — it still burns" : `No — it died approximately ${star.deathYear ? `in the year ${star.deathYear}` : "long ago"}`}
${star.temperature ? `- Surface temperature: ${Math.round(star.temperature).toLocaleString()} Kelvin` : ""}
${star.massSolar ? `- Mass: ${star.massSolar} times the mass of our Sun` : ""}
${star.constellation ? `- Located in the constellation ${star.constellation}` : ""}
- Description: ${star.description}

The listener is hearing this star sonified: its brightness (flux) has been mapped to pitch and rhythm using a ${star.sonificationParams?.timbre || "sine"} wave oscillator at ${star.sonificationParams?.baseFrequency || 440} Hz as the base frequency.${star.sonificationParams?.pulseRate ? ` The star pulses at ${star.sonificationParams.pulseRate.toFixed(1)} beats per minute.` : ""}`;

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Narration stream failed");
    if (!res.headersSent) {
      res.status(500).json({ error: "Narration failed" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`);
      res.end();
    }
  }
});

function buildSonificationParams(
  spectralClass: string,
  temperature: number,
  pulseRate: number | null
): { baseFrequency: number; timbre: "sine" | "sawtooth" | "square" | "triangle" | "fm"; pulseRate: number | null; harmonics: number[] } {
  const freqMap: Record<string, number> = {
    O: 880, B: 660, A: 528, F: 440, G: 329, K: 261, M: 174,
  };
  const timbreMap: Record<string, "sine" | "sawtooth" | "square" | "triangle" | "fm"> = {
    O: "sawtooth", B: "sawtooth", A: "sine", F: "sine", G: "triangle", K: "triangle", M: "fm",
  };
  const cls = spectralClass?.charAt(0).toUpperCase() || "G";
  const baseFrequency = freqMap[cls] || 440;
  const timbre = timbreMap[cls] || "sine";
  const tempFactor = temperature ? (temperature / 5778) : 1;
  const harmonics = cls === "O" || cls === "B"
    ? [1, 2, 3, 4, 5]
    : cls === "M"
    ? [1, 1.5, 2]
    : [1, 2, 3];

  return { baseFrequency, timbre, pulseRate, harmonics };
}

function generateSyntheticLightCurve(
  spectralClass: string,
  pulseRate: number | null
): Array<{ time: number; flux: number }> {
  const points: Array<{ time: number; flux: number }> = [];
  const n = 500;
  const cls = spectralClass?.charAt(0).toUpperCase() || "G";

  // Different variability patterns by spectral class
  const variability: Record<string, number> = {
    O: 0.05, B: 0.03, A: 0.02, F: 0.08, G: 0.01, K: 0.015, M: 0.04,
  };
  const noise = variability[cls] || 0.02;
  const period = pulseRate ? (60 / pulseRate) * 24 : (cls === "M" ? 30 : cls === "F" ? 5 : 0);

  for (let i = 0; i < n; i++) {
    const t = (i / n) * 100;
    let flux = 1.0;

    // Add periodic pulsation if applicable
    if (period > 0) {
      flux += Math.sin((2 * Math.PI * t) / period) * noise * 3;
    }

    // Add random noise
    flux += (Math.random() - 0.5) * noise * 2;

    // Occasional dips (transits, eclipses)
    if (Math.random() < 0.005) {
      flux -= noise * 8 * Math.random();
    }

    points.push({ time: t, flux: Math.max(0.8, Math.min(1.2, flux)) });
  }

  return points;
}

export default router;

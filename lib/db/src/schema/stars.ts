import { pgTable, serial, text, boolean, real, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sonificationParamsSchema = z.object({
  baseFrequency: z.number(),
  timbre: z.enum(["sine", "sawtooth", "square", "triangle", "fm"]),
  pulseRate: z.number().nullable(),
  harmonics: z.array(z.number()),
});

export type SonificationParams = z.infer<typeof sonificationParamsSchema>;

export const starsTable = pgTable("stars", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  commonName: text("common_name"),
  spectralClass: text("spectral_class").notNull(),
  subtype: text("subtype"),
  temperature: real("temperature"),
  massSolar: real("mass_solar"),
  radiusSolar: real("radius_solar"),
  luminositySolar: real("luminosity_solar"),
  distanceLightYears: real("distance_light_years").notNull(),
  isAlive: boolean("is_alive").notNull().default(true),
  transmissionAgeYears: real("transmission_age_years").notNull(),
  deathYear: integer("death_year"),
  constellation: text("constellation"),
  nasaId: text("nasa_id"),
  imageUrl: text("image_url"),
  generatedImageUrl: text("generated_image_url"),
  description: text("description").notNull(),
  sonificationParams: jsonb("sonification_params").$type<SonificationParams>().notNull(),
});

export const insertStarSchema = createInsertSchema(starsTable).omit({ id: true });
export type InsertStar = z.infer<typeof insertStarSchema>;
export type Star = typeof starsTable.$inferSelect;

export const lightCurvePointsTable = pgTable("light_curve_points", {
  id: serial("id").primaryKey(),
  starId: integer("star_id").notNull(),
  time: real("time").notNull(),
  flux: real("flux").notNull(),
});

export type LightCurvePoint = typeof lightCurvePointsTable.$inferSelect;

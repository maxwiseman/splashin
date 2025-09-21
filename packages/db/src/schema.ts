import { relations } from "drizzle-orm";
import { pgEnum, pgTable } from "drizzle-orm/pg-core";
import * as p from "drizzle-orm/pg-core";

import { user } from "./auth-schema";

export const activityType = pgEnum("splashin_activity_type", [
  "in_vehicle",
  "walking",
  "still",
  "on_bicycle",
  "unknown",
]);
export const splashinUser = pgTable("splashin_user", () => ({
  id: p.text().notNull().primaryKey(),
  userId: p.text().references(() => user.id, { onDelete: "set null" }),
  firstName: p.text().notNull(),
  lastName: p.text().notNull(),
  teamId: p.text().references(() => splashinTeam.id, { onDelete: "set null" }),
  profilePicture: p.text(),
  lastLocation: p.geometry("lastLocation", {
    type: "point",
    mode: "xy",
    srid: 4326,
  }),
  hasPremium: p.boolean().notNull().default(false),
  lastActivityType: activityType(),
  authToken: p.text(),
  apiKey: p.text(),
  locationUpdatedAt: p.timestamp(),
  locationPausedUntil: p.timestamp(),
  fakeTargetTeamId: p
    .text()
    .references(() => splashinTeam.id, { onDelete: "set null" }),
}));
export const splashinUserRelations = relations(
  splashinUser,
  ({ many, one }) => ({
    team: one(splashinTeam, {
      fields: [splashinUser.teamId],
      references: [splashinTeam.id],
    }),
    targets: many(splashinTarget, {
      relationName: "userTargets",
    }),
    eliminations: many(splashinElimination, {
      relationName: "userEliminations",
    }),
    fakeTargetTeam: one(splashinTeam, {
      fields: [splashinUser.fakeTargetTeamId],
      references: [splashinTeam.id],
    }),
  }),
);

export const splashinTeam = pgTable("splashin_team", () => ({
  id: p.text().notNull().primaryKey(),
  name: p.text().notNull(),
  color: p.text().notNull(),
}));
export const splashinTeamRelations = relations(splashinTeam, ({ many }) => ({
  users: many(splashinUser),
}));

export const splashinElimination = pgTable(
  "splashin_elimination",
  () => ({
    round: p.numeric().notNull(),
    userId: p
      .text()
      .notNull()
      .references(() => splashinUser.id, { onDelete: "set null" }),
    eliminatedBy: p
      .text()
      .notNull()
      .references(() => splashinUser.id, { onDelete: "set null" }),
    eliminatedAt: p.timestamp().notNull(),
  }),
  (table) => [
    p.primaryKey({ columns: [table.round, table.userId, table.eliminatedBy] }),
  ],
);
export const splashinEliminationRelations = relations(
  splashinElimination,
  ({ one }) => ({
    user: one(splashinUser, {
      fields: [splashinElimination.userId],
      references: [splashinUser.id],
      relationName: "userEliminations",
    }),
    eliminatedBy: one(splashinUser, {
      fields: [splashinElimination.eliminatedBy],
      references: [splashinUser.id],
      relationName: "eliminatedByUser",
    }),
  }),
);

export const splashinTargetSource = pgEnum("splashin_target_source", [
  "game",
  "proxy",
  "word_of_mouth",
]);
export const splashinTarget = pgTable(
  "splashin_target",
  () => ({
    round: p.numeric().notNull(),
    userId: p
      .text()
      .notNull()
      .references(() => splashinUser.id, { onDelete: "cascade" }),
    targetId: p
      .text()
      .notNull()
      .references(() => splashinUser.id, { onDelete: "cascade" }),
    source: splashinTargetSource().notNull(),
  }),
  (table) => [
    p.primaryKey({ columns: [table.round, table.userId, table.targetId] }),
  ],
);
export const splashinTargetRelations = relations(splashinTarget, ({ one }) => ({
  user: one(splashinUser, {
    fields: [splashinTarget.userId],
    references: [splashinUser.id],
    relationName: "userTargets",
  }),
  target: one(splashinUser, {
    fields: [splashinTarget.targetId],
    references: [splashinUser.id],
    relationName: "targetedBy",
  }),
}));

// export const Post = pgTable("post", (t) => ({
//   id: t.text().notNull().primaryKey().defaultRandom(),
//   title: t.varchar({ length: 256 }).notNull(),
//   content: t.text().notNull(),
//   createdAt: t.timestamp().defaultNow().notNull(),
//   updatedAt: t
//     .timestamp({ mode: "date", withTimezone: true })
//     .$onUpdateFn(() => sql`now()`),
// }));

// export const CreatePostSchema = createInsertSchema(Post, {
//   title: z.string().max(256),
//   content: z.string().max(256),
// }).omit({
//   id: true,
//   createdAt: true,
//   updatedAt: true,
// });

export * from "./auth-schema";

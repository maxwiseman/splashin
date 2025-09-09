import { pgTable } from "drizzle-orm/pg-core";
import * as p from "drizzle-orm/pg-core";

import { user } from "./auth-schema";

export const splashinUser = pgTable("splashin_user", () => ({
  id: p.uuid().notNull().primaryKey().defaultRandom(),
  userId: p.text().references(() => user.id, { onDelete: "set null" }),
  firstName: p.text().notNull(),
  lastName: p.text().notNull(),
  profilePicture: p.text(),
  lastLocation: p.geometry("lastLocation", {
    type: "point",
    mode: "xy",
    srid: 4326,
  }),
  locationUpdatedAt: p.timestamp(),
  locationPausedUntil: p.timestamp(),
}));

// export const Post = pgTable("post", (t) => ({
//   id: t.uuid().notNull().primaryKey().defaultRandom(),
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

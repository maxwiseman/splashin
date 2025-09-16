"use server";

import { headers } from "next/headers";

import { eq } from "@splashin/db";
import { db } from "@splashin/db/client";
import { splashinUser } from "@splashin/db/schema";

import { auth } from "~/auth/server";

export async function getLocationEditData() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const data = await db.query.splashinUser.findFirst({
    where: eq(splashinUser.userId, session.user.id),
  });
  return {
    editUntil: data?.locationPausedUntil,
    editedLocation: null,
  };
}

export async function updateLocationEditData(data: {
  editUntil?: Date | null;
  editedLocation?: [number, number];
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return 401;
  console.log("Updating DB", data);
  await db
    .update(splashinUser)
    .set({ locationPausedUntil: data.editUntil })
    .where(eq(splashinUser.userId, session.user.id));
  return 200;
}

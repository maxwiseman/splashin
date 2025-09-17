"use server";

import { headers } from "next/headers";

import { eq } from "@splashin/db";
import { db } from "@splashin/db/client";
import { splashinUser } from "@splashin/db/schema";

import { auth } from "~/auth/server";

export async function getFakeTargetData() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return 401;
  const data = await db.query.splashinUser.findFirst({
    where: eq(splashinUser.userId, session.user.id),
  });
  const teams = await db.query.splashinTeam.findMany();
  return { fakeTargetTeamId: data?.fakeTargetTeamId, teams };
}

export default async function updateFakeTargetData(data: {
  fakeTargetTeamId: string | null;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return 401;
  await db
    .update(splashinUser)
    .set({ fakeTargetTeamId: data.fakeTargetTeamId ?? null })
    .where(eq(splashinUser.userId, session.user.id));
  return 200;
}

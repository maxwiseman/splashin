"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { and, eq, isNotNull } from "@splashin/db";
import { db } from "@splashin/db/client";
import { splashinUser } from "@splashin/db/schema";

import { env } from "~/env";

export async function updateUserLocation(userId: string) {
  const premiumUser = await db.query.splashinUser.findFirst({
    where: and(
      eq(splashinUser.hasPremium, true),
      isNotNull(splashinUser.authToken),
      isNotNull(splashinUser.apiKey),
    ),
  });
  if (!premiumUser) return null;

  await fetch(
    "https://erspvsdfwaqjtuhymubj.supabase.co/rest/v1/rpc/location-request",
    {
      method: "POST",
      headers: {
        Host: "erspvsdfwaqjtuhymubj.supabase.co",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        apikey: premiumUser.apiKey ?? "",
        "User-Agent": "Splashin/5 CFNetwork/3860.100.1 Darwin/25.0.0",
        "x-client-info": "supabase-js-react-native/2.52.1",
        "content-profile": "public",
        Authorization: premiumUser.authToken ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        queue_name: "location-request",
        uid: userId,
      }),
    },
  );
  const data = (await fetch(
    "https://erspvsdfwaqjtuhymubj.supabase.co/rest/v1/rpc/get_map_user_full_v2",
    {
      method: "POST",
      headers: {
        Host: "erspvsdfwaqjtuhymubj.supabase.co",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        apikey: premiumUser.apiKey ?? "",
        "User-Agent": "Splashin/5 CFNetwork/3860.100.1 Darwin/25.0.0",
        "x-client-info": "supabase-js-react-native/2.52.1",
        "content-profile": "public",
        Authorization: premiumUser.authToken ?? "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gid: env.GAME_ID,
        uid: userId,
      }),
    },
  ).then((res) => res.json())) as SingleLocationById;

  after(async () => {
    if (data.l && data.lo && data.a && data.ac && data.s && data.bl)
      await db
        .update(splashinUser)
        .set({
          lastLocation: { x: Number(data.l), y: Number(data.lo) },
          locationUpdatedAt: new Date(data.up),
          lastActivityType: data.a.replace("on_foot", "walking") as "walking",
          locationAccuracy: Number(data.ac),
          speed: Number(data.s),
          batteryLevel: Number(data.bl),
        })
        .where(eq(splashinUser.id, userId));
  });

  return data;
}

export async function updateAllUsers() {
  const premiumUser = await db.query.splashinUser.findFirst({
    where: and(
      eq(splashinUser.hasPremium, true),
      isNotNull(splashinUser.authToken),
      isNotNull(splashinUser.apiKey),
    ),
  });
  if (!premiumUser) return new Response(null);

  const allUserIds = await db.query.splashinUser.findMany({
    columns: { id: true },
  });

  console.log(premiumUser);
  const data = (await fetch(
    "https://erspvsdfwaqjtuhymubj.supabase.co/rest/v1/rpc/get_user_locations_by_user_ids_minimal_v2",
    {
      method: "POST",
      headers: {
        Host: "erspvsdfwaqjtuhymubj.supabase.co",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        apikey: premiumUser.apiKey ?? "",
        "User-Agent": "Splashin/5 CFNetwork/3860.100.1 Darwin/25.0.0",
        "x-client-info": "supabase-js-react-native/2.52.1",
        "content-profile": "public",
        Authorization: premiumUser.authToken ?? "",
        "Content-Type": "application/json",
      },
      // ...options,
      body: JSON.stringify({
        gid: env.GAME_ID,
        user_ids: allUserIds.map((user) => user.id),
        // user_ids: ["0e9ed527-3ab3-413e-aff4-78eb99ae0269"],
      }),
    },
    // options,
  ).then((res) => res.json())) as LocationById[];

  after(async () => {
    await db.transaction(async (tx) => {
      for (const userLoc of data) {
        await tx
          .update(splashinUser)
          .set({
            lastLocation: { x: userLoc.l, y: userLoc.lo },
            locationUpdatedAt: new Date(userLoc.up),
            lastActivityType: userLoc.a.replace(
              "on_foot",
              "walking",
            ) as "walking",
            locationAccuracy: userLoc.ac,
            speed: userLoc.s,
            batteryLevel: userLoc.bl,
          })
          .where(eq(splashinUser.id, userLoc.u));
      }
      const dataUserIds = new Set(data.map((user) => user.u));
      for (const userId of allUserIds) {
        if (dataUserIds.has(userId.id)) continue;
        await tx
          .update(splashinUser)
          .set({
            lastActivityType: null,
            locationAccuracy: null,
            speed: null,
            batteryLevel: null,
            locationUpdatedAt: null,
            lastLocation: null,
          })
          .where(eq(splashinUser.id, userId.id));
      }
    });
    revalidatePath("/map");
  });
}

export interface LocationById {
  u: string;
  l: number;
  lo: number;
  a: string;
  ac: number;
  up: Date;
  av: string;
  i: string;
  bl: number;
  ic: boolean;
  s: number;
  h: number;
  c: string;
  r: string;
  isz: boolean;
}
export interface SingleLocationById {
  u: string;
  ap: string;
  fn: string;
  ln: string;
  le: boolean;
  sl: number;
  e: boolean;
  tc: string;
  tn: string;
  iv: boolean;
  ive: null;
  it: boolean;
  ite: null;
  ib: boolean;
  ibe: null;
  is: boolean;
  ise: null;
  ims: boolean;
  isfp: boolean;
  l: string;
  lo: string;
  a: string;
  ac: string;
  up: Date;
  i: string;
  bl: string;
  ic: string;
  s: string;
  h: string;
  c: string;
  r: string;
  isz: string;
}

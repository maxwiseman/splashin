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

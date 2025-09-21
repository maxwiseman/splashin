import { and, eq, isNotNull } from "@splashin/db";
import { db } from "@splashin/db/client";
import { splashinUser } from "@splashin/db/schema";

import { env } from "~/env";

export async function GET() {
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
  console.log(data);

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
        })
        .where(eq(splashinUser.id, userLoc.u));
    }
  });
  return new Response(JSON.stringify(data));
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

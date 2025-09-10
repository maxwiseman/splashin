import { Suspense } from "react";
import { db } from "@splashin/db/client";
import { splashinTeam, splashinUser } from "@splashin/db/schema";

import { PlayerMap } from "~/components/player-map";
import { MapClient } from "./map.client";

export default function MapPage() {
  const users = db.query.splashinUser.findMany({
    with: { team: true },
  }) as Promise<
    (typeof splashinUser.$inferSelect & {
      team: typeof splashinTeam.$inferSelect;
    })[]
  >;

  return (
    <div className="size-full">
      <Suspense fallback={<div>Loading...</div>}>
        <MapClient users={users} />
      </Suspense>
    </div>
  );
}

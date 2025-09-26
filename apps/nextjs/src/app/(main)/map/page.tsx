import { Suspense } from "react";

import type { splashinTeam, splashinUser } from "@splashin/db/schema";
import { isNotNull } from "@splashin/db";
import { db } from "@splashin/db/client";

import { updateAllUsers } from "./map-actions";
import { MapClient } from "./map.client";

export default async function MapPage() {
  await updateAllUsers();
  const users = db.query.splashinUser.findMany({
    with: { team: true },
    where: (users) => isNotNull(users.lastLocation),
  }) as Promise<
    (typeof splashinUser.$inferSelect & {
      team: typeof splashinTeam.$inferSelect;
    })[]
  >;

  return (
    <div className="!mt-0 size-full">
      <Suspense
        fallback={
          <div className="text-muted-foreground flex size-full items-center justify-center">
            Loading...
          </div>
        }
      >
        <MapClient users={users} />
      </Suspense>
    </div>
  );
}

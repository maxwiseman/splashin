"use client";

import { splashinTeam, splashinUser } from "@splashin/db/schema";

import { PlayerMap } from "~/components/player-map";

export function MapClient({
  users,
}: {
  users: Promise<
    (typeof splashinUser.$inferSelect & {
      team: typeof splashinTeam.$inferSelect;
    })[]
  >;
}) {
  return (
    <PlayerMap
      users={users}
      onUserSelect={(userId) => {
        window.alert(userId);
      }}
    />
  );
}

"use client";

import { use } from "react";

import type { splashinTeam, splashinUser } from "@splashin/db/schema";

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
  const awaitedUsers = use(users);
  return (
    <PlayerMap
      users={awaitedUsers}
      onUserSelect={(userId) => {
        window.alert(userId);
      }}
    />
  );
}

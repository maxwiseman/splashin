"use client";

import type { RefObject } from "react";
import { createContext, use, useMemo, useRef, useState } from "react";

import type {
  activityType,
  splashinTeam,
  splashinUser,
} from "@splashin/db/schema";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@splashin/ui/card";

import { PlayerMap } from "~/components/player-map";
import { MapSearch } from "./map-search";

export const MapContext = createContext<{
  mapRef: RefObject<mapboxgl.Map | null>;
}>({
  mapRef: { current: null },
});

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
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const selectedUser = useMemo(() => {
    return awaitedUsers.find((user) => user.id === selectedUserId);
  }, [awaitedUsers, selectedUserId]);

  const map = useRef<mapboxgl.Map | null>(null);

  return (
    <MapContext.Provider value={{ mapRef: map }}>
      <PlayerMap users={awaitedUsers} onUserSelect={setSelectedUserId} />
      <div className="pointer-events-none fixed top-[7.125rem] right-4 bottom-4 flex w-sm max-w-[calc(100vw-2rem)] flex-col justify-end gap-2 [&>*]:pointer-events-auto">
        <MapSearch users={awaitedUsers} onUserSelect={setSelectedUserId} />
        {selectedUser && (
          <Card className="bg-background/90 w-full rounded-none shadow-none backdrop-blur-sm">
            <CardHeader>
              <CardTitle>
                {`${selectedUser.firstName} ${selectedUser.lastName}`}
              </CardTitle>
              <CardDescription>
                {selectedUser.locationUpdatedAt
                  ? `Updated ${relativeDate(selectedUser.locationUpdatedAt)} • ${formatActivityType(selectedUser.lastActivityType ?? "unknown")}`
                  : "No location data"}
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </MapContext.Provider>
  );
}

export function relativeDate(date: Date) {
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // Less than a minute
  if (diff < 60000) return "just now";

  // Less than an hour
  const diffMinutes = Math.floor(diff / (1000 * 60));
  if (diffMinutes < 60)
    return `${diffMinutes} min${diffMinutes === 1 ? "" : "s"} ago`;

  // Less than a day
  const diffHours = Math.floor(diff / (1000 * 60 * 60));
  if (diffHours < 24)
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

  // Less than a week
  const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (diffDays < 7) {
    return date.toLocaleDateString("en-US", { weekday: "long" });
  }

  // More than a week - show "Jun 13th" format
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatActivityType(
  activity: (typeof activityType.enumValues)[number],
) {
  return activity
    .replaceAll("_", " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

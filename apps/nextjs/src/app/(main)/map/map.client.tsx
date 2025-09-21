"use client";

import { use, useMemo, useState } from "react";

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

  return (
    <>
      <PlayerMap users={awaitedUsers} onUserSelect={setSelectedUserId} />
      {selectedUser && (
        <div className="pointer-events-none fixed top-[7.125rem] right-4 bottom-4 flex w-1/4 min-w-sm flex-col justify-end">
          <Card className="bg-background/80 pointer-events-auto w-full rounded-none shadow-none backdrop-blur-md">
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
        </div>
      )}
    </>
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

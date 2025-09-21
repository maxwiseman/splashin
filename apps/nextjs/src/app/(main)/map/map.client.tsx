"use client";

import type { RefObject } from "react";
import {
  createContext,
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMutation } from "@tanstack/react-query";

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
import { updateUserLocation } from "./map-actions";
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
  const map = useRef<mapboxgl.Map | null>(null);
  const awaitedUsers = use(users);
  const [usersState, setUsersState] =
    useState<typeof awaitedUsers>(awaitedUsers);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const selectedUser = useMemo(() => {
    return usersState.find((user) => user.id === selectedUserId);
  }, [usersState, selectedUserId]);

  const [isFollowing, setIsFollowing] = useState(false);

  const updateUserMutation = useMutation({
    mutationFn: updateUserLocation,
    mutationKey: ["updateUser", selectedUserId],
  });

  useEffect(() => {
    if (map.current) {
      map.current.on("drag", () => {
        console.log("not following");
        setIsFollowing(false);
      });
    }
  }, [map]);

  // Polling control refs
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollGenerationRef = useRef(0);

  // Start/stop polling when selected user changes
  useEffect(() => {
    // Cleanup helper
    const cleanup = () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
    };

    cleanup();

    if (!selectedUserId) return;

    pollGenerationRef.current += 1;
    const generation = pollGenerationRef.current;

    const pollOnce = async () => {
      if (generation !== pollGenerationRef.current) return;
      try {
        const result = await updateUserMutation.mutateAsync(selectedUserId);

        if (generation !== pollGenerationRef.current) return;

        if (!result) return;

        setUsersState((prev) =>
          prev.map((u) =>
            u.id === selectedUserId
              ? {
                  ...u,
                  lastLocation: {
                    // schema uses (x, y) as (lat, lon)
                    x: Number(result.l),
                    y: Number(result.lo),
                  },
                  locationAccuracy: Number(result.ac) as number | null,
                  locationUpdatedAt: new Date(result.up),
                  lastActivityType: result.a.replace(
                    "on_foot",
                    "walking",
                  ) as (typeof activityType)["enumValues"][number],
                  speed: Number(result.s),
                  batteryLevel: Number(result.bl),
                }
              : u,
          ),
        );
        if (isFollowing) {
          map.current?.flyTo({
            center: [Number(result.lo), Number(result.l)],
            zoom: 15,
            speed: 1,
          });
        }
      } catch {
        // If aborted due to selection change/unmount, silently ignore
        // For other errors, we still continue polling after the delay
      } finally {
        if (generation === pollGenerationRef.current) {
          pollTimeoutRef.current = setTimeout(() => {
            void pollOnce();
          }, 5000);
        }
      }
    };

    // Kick off immediately
    void pollOnce();

    return () => {
      cleanup();
    };
  }, [selectedUserId, updateUserMutation.mutate, isFollowing]);

  return (
    <MapContext.Provider value={{ mapRef: map }}>
      <PlayerMap
        users={usersState}
        onUserSelect={(userId) => {
          setSelectedUserId(userId);
          setIsFollowing(true);
          if (selectedUser?.lastLocation?.y && selectedUser.lastLocation.x)
            map.current?.flyTo({
              center: [
                selectedUser.lastLocation.y,
                selectedUser.lastLocation.x,
              ],
              zoom: 15,
              speed: 2,
            });
        }}
      />
      <div className="pointer-events-none fixed top-[7.125rem] right-4 bottom-4 flex w-sm max-w-[calc(100vw-2rem)] flex-col justify-end gap-2 [&>*]:pointer-events-auto">
        <MapSearch
          users={usersState}
          onUserSelect={(userId) => {
            setSelectedUserId(userId);
            setIsFollowing(true);
            if (selectedUser?.lastLocation?.y && selectedUser.lastLocation.x)
              map.current?.flyTo({
                center: [
                  selectedUser.lastLocation.y,
                  selectedUser.lastLocation.x,
                ],
                zoom: 15,
                speed: 2,
              });
          }}
        />
        {selectedUser && (
          <Card className="bg-background/90 w-full rounded-none shadow-none backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center align-baseline">
                {`${selectedUser.firstName} ${selectedUser.lastName}`}
              </CardTitle>
              <CardDescription>
                <SeparatedChildren>
                  {selectedUser.locationUpdatedAt &&
                  new Date().getTime() -
                    selectedUser.locationUpdatedAt.getTime() <
                    60000 ? (
                    <>
                      <div className="mr-1 inline-block size-2 animate-pulse rounded-full bg-green-500" />
                      Live
                    </>
                  ) : (
                    `Updated ${relativeDate(selectedUser.locationUpdatedAt ?? new Date())}`
                  )}
                  {selectedUser.lastActivityType &&
                  selectedUser.lastActivityType !== "unknown"
                    ? formatActivityType(selectedUser.lastActivityType)
                    : null}
                  {selectedUser.speed && Math.floor(selectedUser.speed) > 0
                    ? `${Math.round(selectedUser.speed)} mph`
                    : null}
                  {selectedUser.batteryLevel
                    ? `${Math.round(selectedUser.batteryLevel * 100)}%`
                    : null}
                </SeparatedChildren>
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </MapContext.Provider>
  );
}

export function SeparatedChildren({
  children,
  separator = " • ",
}: {
  children: React.ReactNode[];
  separator?: React.ReactNode;
}) {
  const filteredChildren = children.filter(Boolean);
  return filteredChildren.flatMap((item, i) =>
    i < filteredChildren.length - 1 ? [item, separator] : item,
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

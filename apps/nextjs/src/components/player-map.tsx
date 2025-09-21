"use client";

import React, { useCallback, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { useTheme } from "next-themes";

import "mapbox-gl/dist/mapbox-gl.css";

import type { splashinTeam, splashinUser } from "@splashin/db/schema";

import { env } from "~/env";

export function PlayerMap({
  users,
  onUserSelect = (userId) => window.alert(userId),
}: {
  users: (typeof splashinUser.$inferSelect & {
    team: typeof splashinTeam.$inferSelect;
  })[];
  onUserSelect?: (userId: string) => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const { resolvedTheme } = useTheme();

  // Function to create a marker element for a user
  const createMarkerElement = useCallback(
    (user: (typeof users)[0]) => {
      const el = document.createElement("div");
      const width = 60;
      const height = 60;
      el.className = "marker";
      el.style.width = `${width}px`;
      el.style.height = `${height}px`;
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.border = "2px solid white";
      el.style.borderRadius = "50%";
      el.style.cursor = "pointer";
      el.style.fontSize = `${Math.min(width, height) * 0.4}px`;
      el.style.fontWeight = "bold";
      el.style.fontFamily = "Arial, sans-serif";
      el.style.color = "white";

      // Show initials with team color background
      el.style.backgroundColor = user.team.color;
      el.textContent =
        `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

      el.addEventListener("click", () => {
        onUserSelect(user.id);
      });

      return el;
    },
    [onUserSelect],
  );

  // Function to update markers on the map
  const updateMarkers = useCallback(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.length = 0;

    // Add new markers for users with locations
    const usersWithLocation = users.filter((user) => user.lastLocation);

    usersWithLocation.forEach((user) => {
      if (!user.lastLocation) return;

      const el = createMarkerElement(user);
      const marker = new mapboxgl.Marker({
        element: el,
        anchor: "center",
      }).setLngLat([user.lastLocation.y, user.lastLocation.x]);

      if (mapRef.current) {
        marker.addTo(mapRef.current);
      }

      markersRef.current.push(marker);
    });
  }, [users, createMarkerElement]);

  // Initialize map (only once)
  useEffect(() => {
    mapboxgl.accessToken = env.NEXT_PUBLIC_MAPBOX_TOKEN;

    // Disable Mapbox telemetry to prevent blocked requests
    if (typeof window !== "undefined") {
      // @ts-expect-error -- this is just a mapbox thing that I didn't care to type
      window.mapboxgl_disable_telemetry = true;
    }

    mapRef.current = new mapboxgl.Map({
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      container: mapContainerRef.current!,
      style: "mapbox://styles/mapbox/standard",
      config: {
        basemap: {
          lightPreset: resolvedTheme === "dark" ? "night" : "day",
          theme: "monochrome",
        },
      },
      center: [-83.9228, 35.963556],
      zoom: 10,
      // Disable telemetry collection
      collectResourceTiming: false,
      trackResize: false,
    });

    // Initial markers update
    updateMarkers();
  }, [updateMarkers]);

  // Update theme without recreating map
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setConfig("basemap", {
        lightPreset: resolvedTheme === "dark" ? "night" : "day",
        theme: "monochrome",
      });
    }
  }, [resolvedTheme]);

  // Update markers when users change
  useEffect(() => {
    if (mapRef.current) {
      updateMarkers();
    }
  }, [updateMarkers]);

  return <div ref={mapContainerRef} id="map" className="size-full" />;
}

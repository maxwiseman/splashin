"use client";

import React, { use, useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { useTheme } from "next-themes";

import "mapbox-gl/dist/mapbox-gl.css";

import { splashinTeam, splashinUser } from "@splashin/db/schema";

export function PlayerMap({
  users: usersPromise,
  onUserSelect = (userId) => window.alert(userId),
}: {
  users: Promise<
    (typeof splashinUser.$inferSelect & {
      team: typeof splashinTeam.$inferSelect;
    })[]
  >;
  onUserSelect?: (userId: string) => void;
}) {
  const users = use(usersPromise);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    console.log(users);
    mapboxgl.accessToken =
      "pk.eyJ1IjoibWF4d2lzZW1hbiIsImEiOiJjbTNwYWxwa2UwY2l3MmtxYTczbnR2OWR4In0.HC6IH-zjDWivQaoqjKVCUQ";

    // Disable Mapbox telemetry to prevent blocked requests
    if (typeof window !== "undefined") {
      (window as any).mapboxgl_disable_telemetry = true;
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

    const geojson = {
      type: "FeatureCollection",
      features: users
        .filter((user) => user.lastLocation)
        .map((user) => ({
          type: "Feature",
          properties: {
            message: `${user.firstName} ${user.lastName}`,
            iconSize: [60, 60],
          },
          geometry: {
            type: "Point",
            coordinates: [user.lastLocation!.y, user.lastLocation!.x],
          },
        })),
    };

    const usersWithLocation = users.filter((user) => user.lastLocation);

    for (let i = 0; i < geojson.features.length; i++) {
      const marker = geojson.features[i]!;
      const user = usersWithLocation[i]!;

      const el = document.createElement("div");
      const width = marker.properties.iconSize[0] ?? 60;
      const height = marker.properties.iconSize[1] ?? 60;
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

      if (user.profilePicture) {
        // Use background image for profile picture
        el.style.backgroundImage = `url(${user.profilePicture})`;
        el.style.backgroundColor = user.team.color; // fallback color

        // Handle image load error by checking if image loads
        const testImg = new Image();
        testImg.onerror = () => {
          el.style.backgroundImage = "none";
          el.style.backgroundColor = user.team.color;
          el.textContent =
            `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
        };
        testImg.src = user.profilePicture;
      } else {
        // Show initials with team color background
        el.style.backgroundColor = user.team.color;
        el.textContent =
          `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
      }

      el.addEventListener("click", () => {
        onUserSelect(user.id);
      });

      new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat(marker.geometry.coordinates as [number, number])
        .addTo(mapRef.current);
    }
  }, [resolvedTheme]);

  return <div ref={mapContainerRef} id="map" className="size-full" />;
}

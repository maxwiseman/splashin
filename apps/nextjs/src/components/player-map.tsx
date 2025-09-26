/* eslint-disable react-hooks/react-compiler */
"use client";

import React, { useCallback, useContext, useEffect, useRef } from "react";
import * as turf from "@turf/turf";
import mapboxgl from "mapbox-gl";
import { useTheme } from "next-themes";

import "mapbox-gl/dist/mapbox-gl.css";

import type { splashinTeam, splashinUser } from "@splashin/db/schema";

import { MapContext } from "~/app/(main)/map/map.client";
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
  const { mapRef } = useContext(MapContext);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const markersByUserIdRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
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

  // Function to create accuracy circles using GeoJSON
  const createAccuracyCircles = useCallback(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    // Check if style is loaded, if not, wait for it
    if (!map.isStyleLoaded()) {
      map.once("styledata", () => {
        createAccuracyCircles();
      });
      return;
    }

    // Update in place when possible

    // Create circles for users with location accuracy
    const usersWithAccuracy = users.filter(
      (user) => user.lastLocation && user.locationAccuracy,
    );

    if (usersWithAccuracy.length === 0) return;

    const circles = usersWithAccuracy
      .map((user) => {
        if (!user.lastLocation) return null;

        const userLng = user.lastLocation.y;
        const userLat = user.lastLocation.x;
        const accuracy = Number(user.locationAccuracy);

        const center = turf.point([userLng, userLat]);
        const options = { steps: 80, units: "meters" as const };
        return turf.circle(center, accuracy, options);
      })
      .filter(
        (circle): circle is NonNullable<typeof circle> => circle !== null,
      );

    // Combine all circles into a single GeoJSON feature collection
    const featureCollection = turf.featureCollection(circles);

    // Theme-aware colors
    const isDark = resolvedTheme === "dark";
    const fillColor = isDark
      ? "rgba(255, 255, 255, 0.4)"
      : "rgba(0, 0, 0, 0.4)";
    const strokeColor = isDark
      ? "rgba(255, 255, 255, 0.7)"
      : "rgba(0, 0, 0, 0.7)";

    const existingSource = map.getSource("accuracy-circles");
    if (existingSource && existingSource.type === "geojson") {
      existingSource.setData(
        featureCollection as unknown as GeoJSON.FeatureCollection,
      );
      // keep paint props in sync with theme
      if (map.getLayer("accuracy-circle-fill")) {
        map.setPaintProperty("accuracy-circle-fill", "fill-color", fillColor);
        map.setPaintProperty("accuracy-circle-fill", "fill-opacity", 0.25);
        map.setPaintProperty(
          "accuracy-circle-fill",
          "fill-emissive-strength",
          1,
        );
      }
      if (map.getLayer("accuracy-circle-stroke")) {
        map.setPaintProperty(
          "accuracy-circle-stroke",
          "line-color",
          strokeColor,
        );
        map.setPaintProperty("accuracy-circle-stroke", "line-width", 1);
        map.setPaintProperty(
          "accuracy-circle-stroke",
          "line-emissive-strength",
          1,
        );
      }
      return;
    }

    try {
      // Add the source & layers once
      map.addSource("accuracy-circles", {
        type: "geojson",
        data: featureCollection,
      });
      map.addLayer({
        id: "accuracy-circle-fill",
        type: "fill",
        source: "accuracy-circles",
        paint: {
          "fill-color": fillColor,
          "fill-opacity": 0.25,
          "fill-emissive-strength": 1,
        },
      });
      map.addLayer({
        id: "accuracy-circle-stroke",
        type: "line",
        source: "accuracy-circles",
        paint: {
          "line-color": strokeColor,
          "line-width": 1,
          "line-emissive-strength": 1,
        },
      });
    } catch (error) {
      console.warn("Failed to add accuracy circles:", error);
    }
  }, [users, mapRef, resolvedTheme]);

  // Function to update markers on the map (diff-based)
  const updateMarkers = useCallback(() => {
    if (!mapRef.current) return;

    const usersWithLocation = users.filter((user) => user.lastLocation);

    const nextIds = new Set(usersWithLocation.map((u) => u.id));

    // Remove markers that no longer exist
    for (const [userId, marker] of markersByUserIdRef.current.entries()) {
      if (!nextIds.has(userId)) {
        marker.remove();
        markersByUserIdRef.current.delete(userId);
      }
    }

    // Add or update markers
    usersWithLocation.forEach((user) => {
      if (!user.lastLocation) return;
      const lngLat: [number, number] = [
        user.lastLocation.y,
        user.lastLocation.x,
      ];
      const existing = markersByUserIdRef.current.get(user.id);
      if (existing) {
        existing.setLngLat(lngLat);
        return;
      }
      const el = createMarkerElement(user);
      const mapInstance = mapRef.current;
      if (!mapInstance) return;
      const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat(lngLat)
        .addTo(mapInstance);
      markersRef.current.push(marker);
      markersByUserIdRef.current.set(user.id, marker);
    });

    // Update accuracy circles using GeoJSON
    createAccuracyCircles();
  }, [users, createMarkerElement, createAccuracyCircles, mapRef]);

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

    // Add event listener for when the style loads
    mapRef.current.on("load", () => {
      // Initial markers update
      updateMarkers();
    });

    // Also call updateMarkers immediately in case the map is already loaded
    updateMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update theme without recreating map
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setConfig("basemap", {
        lightPreset: resolvedTheme === "dark" ? "night" : "day",
        theme: "monochrome",
      });
    }
  }, [resolvedTheme, mapRef]);

  // Update accuracy circles when theme changes
  useEffect(() => {
    if (mapRef.current) {
      createAccuracyCircles();
    }
  }, [resolvedTheme, createAccuracyCircles, mapRef]);

  // Update markers when users change
  useEffect(() => {
    if (mapRef.current) {
      updateMarkers();
    }
  }, [updateMarkers, mapRef]);

  // Cleanup on unmount
  useEffect(() => {
    const mapMarkersMap = markersByUserIdRef.current;
    const mapMarkersList = markersRef.current;
    return () => {
      for (const marker of mapMarkersMap.values()) {
        marker.remove();
      }
      mapMarkersMap.clear();
      mapMarkersList.forEach((m) => m.remove());
      mapMarkersList.length = 0;
    };
  }, []);

  return <div ref={mapContainerRef} id="map" className="size-full" />;
}

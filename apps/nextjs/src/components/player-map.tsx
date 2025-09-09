"use client";

import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { useTheme } from "next-themes";

import "mapbox-gl/dist/mapbox-gl.css";

export function PlayerMap() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    mapboxgl.accessToken =
      "pk.eyJ1IjoibWF4d2lzZW1hbiIsImEiOiJjbTNwYWxwa2UwY2l3MmtxYTczbnR2OWR4In0.HC6IH-zjDWivQaoqjKVCUQ";

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
      center: [-65.017, -16.457],
      zoom: 5,
    });

    const geojson = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            message: "Foo",
            imageId: 1011,
            iconSize: [60, 60],
          },
          geometry: {
            type: "Point",
            coordinates: [-66.324462, -16.024695],
          },
        },
        {
          type: "Feature",
          properties: {
            message: "Bar",
            imageId: 870,
            iconSize: [50, 50],
          },
          geometry: {
            type: "Point",
            coordinates: [-61.21582, -15.971891],
          },
        },
        {
          type: "Feature",
          properties: {
            message: "Baz",
            imageId: 837,
            iconSize: [40, 40],
          },
          geometry: {
            type: "Point",
            coordinates: [-63.292236, -18.281518],
          },
        },
      ],
    };

    for (const marker of geojson.features) {
      const el = document.createElement("div");
      const width = marker.properties.iconSize[0];
      const height = marker.properties.iconSize[1];
      el.className = "marker";
      el.style.backgroundImage = `url(https://picsum.photos/id/${marker.properties.imageId}/${width}/${height})`;
      el.style.width = `${width}px`;
      el.style.height = `${height}px`;
      el.style.backgroundSize = "100%";
      el.style.display = "block";
      el.style.border = "none";
      el.style.borderRadius = "50%";
      el.style.cursor = "pointer";
      el.style.padding = "0";

      el.addEventListener("click", () => {
        window.alert(marker.properties.message);
      });

      new mapboxgl.Marker(el)
        .setLngLat(marker.geometry.coordinates as [number, number])
        .addTo(mapRef.current);
    }
  }, [resolvedTheme]);

  return <div ref={mapContainerRef} id="map" className="size-full" />;
}

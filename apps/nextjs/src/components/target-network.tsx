"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

export function TargetNetwork() {
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    // Load the image
    const img = new Image();
    img.src = "/favicon.svg"; // Use your desired image path
    img.onload = () => {
      imgRef.current = img;
    };
  }, []);

  const { resolvedTheme } = useTheme();

  return (
    <ForceGraph2D
      linkColor="#FFFFFF"
      nodeColor="#FFFFFF"
      graphData={{
        nodes: [
          { id: "Myriel", group: 1 },
          { id: "Napoleon", group: 1 },
          { id: "Marie", group: 1 },
          { id: "Anne", group: 1 },
          { id: "Brigitte", group: 1 },
          { id: "Elisabeth", group: 1 },
          { id: "Cosette", group: 1 },
          { id: "Fantine", group: 1 },
          { id: "Mme.Thenardier", group: 1 },
          { id: "Mme.deR", group: 1 },
        ],
        links: [
          { source: "Myriel", target: "Napoleon" },
          { source: "Myriel", target: "Marie" },
          { source: "Myriel", target: "Anne" },
          { source: "Myriel", target: "Brigitte" },
          { source: "Myriel", target: "Elisabeth" },
        ],
      }}
      nodeCanvasObject={(node, ctx, globalScale) => {
        const img = imgRef.current;
        if (!img) return; // Don't render if image isn't loaded yet

        const size = 30 / globalScale; // Node size that scales with zoom

        // Draw the image centered on the node
        ctx.drawImage(
          img,
          (node.x ?? 0) - size / 2,
          (node.y ?? 0) - size / 2,
          size,
          size,
        );

        node.__bckgDimensions = [size, size]; // for pointer area
      }}
      nodePointerAreaPaint={(node, color, ctx) => {
        const size = (node.__bckgDimensions as number[] | undefined)?.[0] ?? 30;
        ctx.fillStyle = color;
        ctx.fillRect(
          (node.x ?? 0) - size / 2,
          (node.y ?? 0) - size / 2,
          size,
          size,
        );
      }}
    />
  );
}

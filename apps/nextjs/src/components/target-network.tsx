"use client";

import { useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  splashinTarget,
  splashinTeam,
  splashinUser,
} from "@splashin/db/schema";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

// Constants
const GRAPH_CONFIG = {
  NODE_SIZE: 50,
  LINK_DISTANCE: 100,
  CHARGE_STRENGTH: -300,
  COLLISION_RADIUS: 30,
  BORDER_WIDTH: 2,
  FONT_SIZE_RATIO: 1,
} as const;

const COLORS = {
  LINK: "#FFFFFF",
  NODE: "#FFFFFF",
  BORDER: "#FFFFFF",
  TEXT: "#FFFFFF",
} as const;

// Types
type PlayerWithTargets = typeof splashinUser.$inferSelect & {
  targets: (typeof splashinTarget.$inferSelect)[];
  team: typeof splashinTeam.$inferSelect;
};

interface GraphNode {
  id: string;
  group: number;
  profilePicture: string | null;
  initials: string;
  color: string;
  x?: number;
  y?: number;
  __bckgDimensions?: [number, number];
}

interface GraphLink {
  source: string;
  target: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// Custom hooks
function useImageLoader(playersWithTargets: PlayerWithTargets[]) {
  const loadedImages = useRef<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    const uniqueProfilePictures = new Set(
      playersWithTargets
        .map((player) => player.profilePicture)
        .filter((url): url is string => Boolean(url)),
    );

    uniqueProfilePictures.forEach((url) => {
      if (!loadedImages.current.has(url)) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = url;
        img.onload = () => {
          loadedImages.current.set(url, img);
        };
        img.onerror = () => {
          console.warn(`Failed to load profile picture: ${url}`);
        };
      }
    });
  }, [playersWithTargets]);

  return loadedImages;
}

function useForceGraphConfig(fgRef: React.RefObject<any>) {
  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3Force("link")?.distance(GRAPH_CONFIG.LINK_DISTANCE);
      fgRef.current.d3Force("charge")?.strength(GRAPH_CONFIG.CHARGE_STRENGTH);
      fgRef.current.d3Force(
        "collision",
        fgRef.current.d3?.forceCollide?.(GRAPH_CONFIG.COLLISION_RADIUS),
      );
    }
  }, []);
}

// Helper functions
function createGraphData(playersWithTargets: PlayerWithTargets[]): GraphData {
  const nodes: GraphNode[] = playersWithTargets.map((player) => ({
    id: player.id,
    group: 1,
    profilePicture: player.profilePicture,
    initials:
      `${player.firstName.charAt(0)}${player.lastName.charAt(0)}`.toUpperCase(),
    color: player.team.color,
  }));

  const links: GraphLink[] = playersWithTargets.flatMap((player) =>
    player.targets.map((target: typeof splashinTarget.$inferSelect) => ({
      source: player.id,
      target: target.targetId,
    })),
  );

  return { nodes, links };
}

function drawProfilePicture(
  ctx: CanvasRenderingContext2D,
  node: GraphNode,
  img: HTMLImageElement,
  size: number,
  globalScale: number,
) {
  const x = node.x ?? 0;
  const y = node.y ?? 0;

  // Draw the profile picture as a circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, 2 * Math.PI);
  ctx.clip();
  ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
  ctx.restore();

  // Add border
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, 2 * Math.PI);
  ctx.strokeStyle = COLORS.BORDER;
  ctx.lineWidth = GRAPH_CONFIG.BORDER_WIDTH / globalScale;
  ctx.stroke();
}

function drawInitialsCircle(
  ctx: CanvasRenderingContext2D,
  node: GraphNode,
  size: number,
  globalScale: number,
) {
  const x = node.x ?? 0;
  const y = node.y ?? 0;

  // Draw background circle
  ctx.beginPath();
  ctx.arc(x, y, size / 2, 0, 2 * Math.PI);
  ctx.fillStyle = node.color;
  ctx.fill();
  ctx.strokeStyle = COLORS.BORDER;
  ctx.lineWidth = GRAPH_CONFIG.BORDER_WIDTH / globalScale;
  ctx.stroke();

  // Draw initials text
  ctx.fillStyle = COLORS.TEXT;
  ctx.font = `${(size * GRAPH_CONFIG.FONT_SIZE_RATIO) / globalScale}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(node.initials, x, y);
}

export function TargetNetwork({
  playersWithTargets,
}: {
  playersWithTargets: PlayerWithTargets[];
}) {
  const fgRef = useRef<any>(null);
  const graphData = createGraphData(playersWithTargets);
  const loadedImages = useImageLoader(playersWithTargets);

  useForceGraphConfig(fgRef);

  const renderNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const size = GRAPH_CONFIG.NODE_SIZE / globalScale;
      const graphNode = node as GraphNode;

      const img = graphNode.profilePicture
        ? loadedImages.current.get(graphNode.profilePicture)
        : null;

      if (img) {
        drawProfilePicture(ctx, graphNode, img, size, globalScale);
      } else {
        drawInitialsCircle(ctx, graphNode, size, globalScale);
      }

      // Set dimensions for pointer area
      graphNode.__bckgDimensions = [size, size];
    },
    [loadedImages],
  );

  const renderPointerArea = useCallback(
    (node: any, color: string, ctx: CanvasRenderingContext2D) => {
      const size = (node.__bckgDimensions as number[] | undefined)?.[0] ?? 30;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(node.x ?? 0, node.y ?? 0, size / 2, 0, 2 * Math.PI);
      ctx.fill();
    },
    [],
  );

  return (
    <ForceGraph2D
      ref={fgRef}
      linkColor={COLORS.LINK}
      nodeColor={COLORS.NODE}
      graphData={graphData}
      nodeRelSize={8}
      nodeCanvasObject={renderNode}
      nodePointerAreaPaint={renderPointerArea}
    />
  );
}

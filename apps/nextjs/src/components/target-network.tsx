"use client";

import type {
  ForceGraphMethods,
  LinkObject,
  NodeObject,
} from "react-force-graph-2d";
import { useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";

import type {
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
  CHARGE_STRENGTH: -100,
  COLLISION_RADIUS: 50,
  CENTER_STRENGTH: 0.05,
  BORDER_WIDTH: 2,
  FONT_SIZE_RATIO: 0.4,
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

interface TeamAvatar {
  profilePicture: string | null;
  initials: string;
}

interface TeamGraphNode extends NodeObject {
  id: string; // team id
  color: string;
  avatars: TeamAvatar[]; // up to 2
  __bckgDimensions?: [number, number];
}

interface GraphLink extends LinkObject {
  source: string; // team id
  target: string; // team id
}

interface GraphData {
  nodes: TeamGraphNode[];
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

function useForceGraphConfig(
  fgRef: React.MutableRefObject<
    ForceGraphMethods<NodeObject, LinkObject> | undefined
  >,
) {
  useEffect(() => {
    const timer = setTimeout(() => {
      if (fgRef.current) {
        // Configure link distance
        const linkForce = fgRef.current.d3Force("link");
        if (linkForce && "distance" in linkForce) {
          linkForce.distance(GRAPH_CONFIG.LINK_DISTANCE);
        }

        // Configure charge strength
        const chargeForce = fgRef.current.d3Force("charge");
        if (chargeForce && "strength" in chargeForce) {
          chargeForce.strength(GRAPH_CONFIG.CHARGE_STRENGTH);
        }

        // Configure collision detection
        const collisionForce = fgRef.current.d3Force("collision");
        if (collisionForce && "radius" in collisionForce) {
          collisionForce.radius(GRAPH_CONFIG.COLLISION_RADIUS);
        }

        // Replace default centering with adjustable x/y forces (no imports)
        const center = fgRef.current.centerAt();
        const centerStrength = GRAPH_CONFIG.CENTER_STRENGTH;

        // Remove default center force to avoid competing behaviors
        fgRef.current.d3Force("center", null);

        // Custom x-axis centering force
        const forceX = (() => {
          let nodes: any[] = [];
          const f = (alpha: number) => {
            if (centerStrength <= 0) return;
            const cx = center.x;
            for (let i = 0, n = nodes.length; i < n; i += 1) {
              const node = nodes[i];
              node.vx += (cx - (node.x ?? 0)) * centerStrength * alpha;
            }
          };
          (f as any).initialize = (ns: any[]) => {
            nodes = ns;
          };
          return f;
        })();

        // Custom y-axis centering force
        const forceY = (() => {
          let nodes: any[] = [];
          const f = (alpha: number) => {
            if (centerStrength <= 0) return;
            const cy = center.y;
            for (let i = 0, n = nodes.length; i < n; i += 1) {
              const node = nodes[i];
              node.vy += (cy - (node.y ?? 0)) * centerStrength * alpha;
            }
          };
          (f as any).initialize = (ns: any[]) => {
            nodes = ns;
          };
          return f;
        })();

        // Apply custom forces
        fgRef.current.d3Force("x", forceX);
        fgRef.current.d3Force("y", forceY);

        // Reheat the simulation to apply changes
        fgRef.current.d3ReheatSimulation?.();
      }
    }, 100); // Small delay to ensure graph is initialized

    return () => clearTimeout(timer);
  }, [fgRef]);
}

// Helper functions
function createGraphData(playersWithTargets: PlayerWithTargets[]): GraphData {
  // Map userId -> teamId for resolving target teams
  const userIdToTeamId = new Map<string, string>();
  playersWithTargets.forEach((p) => {
    if (p.id && p.team && p.team.id) userIdToTeamId.set(p.id, p.team.id);
  });

  // Aggregate players by team
  const teamIdToPlayers = new Map<string, PlayerWithTargets[]>();
  const teamIdToColor = new Map<string, string>();
  playersWithTargets.forEach((p) => {
    const teamId = p.team ? p.team.id : undefined;
    if (!teamId) return;
    if (!teamIdToPlayers.has(teamId)) teamIdToPlayers.set(teamId, []);
    const arr = teamIdToPlayers.get(teamId);
    if (arr) arr.push(p);
    teamIdToColor.set(teamId, p.team.color);
  });

  // Build team nodes with up to 2 avatars
  const nodes: TeamGraphNode[] = Array.from(teamIdToPlayers.entries()).map(
    ([teamId, players]) => {
      const avatars: TeamAvatar[] = players.slice(0, 2).map((pl) => ({
        profilePicture: pl.profilePicture ?? null,
        initials:
          `${pl.firstName.charAt(0)}${pl.lastName.charAt(0)}`.toUpperCase(),
      }));

      return {
        id: teamId,
        color: teamIdToColor.get(teamId) ?? COLORS.NODE,
        avatars,
      };
    },
  );

  // Build team-to-team links, deduped
  const linkKeySet = new Set<string>();
  const links: GraphLink[] = [];
  playersWithTargets.forEach((p) => {
    const sourceTeamId = p.team ? p.team.id : undefined;
    if (!sourceTeamId) return;
    for (const t of p.targets) {
      const targetTeamId = userIdToTeamId.get(t.targetId);
      if (!targetTeamId || targetTeamId === sourceTeamId) continue;
      const key = `${sourceTeamId}->${targetTeamId}`;
      if (linkKeySet.has(key)) continue;
      linkKeySet.add(key);
      links.push({ source: sourceTeamId, target: targetTeamId });
    }
  });

  return { nodes, links };
}

function drawAvatar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  teamColor: string,
  img: HTMLImageElement | undefined,
  initials: string,
) {
  if (img) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, 2 * Math.PI);
    ctx.clip();
    ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, 2 * Math.PI);
    ctx.strokeStyle = COLORS.BORDER;
    ctx.lineWidth = GRAPH_CONFIG.BORDER_WIDTH;
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, 2 * Math.PI);
    ctx.fillStyle = teamColor;
    ctx.fill();
    ctx.strokeStyle = COLORS.BORDER;
    ctx.lineWidth = GRAPH_CONFIG.BORDER_WIDTH;
    ctx.stroke();

    ctx.fillStyle = COLORS.TEXT;
    ctx.font = `${size * GRAPH_CONFIG.FONT_SIZE_RATIO}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials, x, y);
  }
}

export function TargetNetwork({
  playersWithTargets,
}: {
  playersWithTargets: PlayerWithTargets[];
}) {
  const fgRef = useRef<ForceGraphMethods<NodeObject, LinkObject> | undefined>(
    undefined,
  );
  const graphData = createGraphData(playersWithTargets);
  const loadedImages = useImageLoader(playersWithTargets);

  useForceGraphConfig(fgRef);

  const renderNode = useCallback(
    (node: NodeObject, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const size = GRAPH_CONFIG.NODE_SIZE / globalScale;
      const teamNode = node as TeamGraphNode;
      const x = teamNode.x ?? 0;
      const y = teamNode.y ?? 0;

      const overlap = size * 0.5; // amount of overlap between avatars
      const [left, right] = teamNode.avatars.slice(0, 2);

      if (left && right) {
        const leftImg = left.profilePicture
          ? loadedImages.current.get(left.profilePicture)
          : undefined;
        const rightImg = right.profilePicture
          ? loadedImages.current.get(right.profilePicture)
          : undefined;

        // Draw left slightly to the left, then right on top for nice overlap
        drawAvatar(
          ctx,
          x - overlap / 2,
          y,
          size,
          teamNode.color,
          leftImg,
          left.initials,
        );
        drawAvatar(
          ctx,
          x + overlap / 2,
          y,
          size,
          teamNode.color,
          rightImg,
          right.initials,
        );

        teamNode.__bckgDimensions = [size + overlap, size];
      } else if (left) {
        const only = left;
        const onlyImg = only.profilePicture
          ? loadedImages.current.get(only.profilePicture)
          : undefined;
        drawAvatar(ctx, x, y, size, teamNode.color, onlyImg, only.initials);
        teamNode.__bckgDimensions = [size, size];
      } else {
        // Fallback: empty circle with team color
        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, 2 * Math.PI);
        ctx.fillStyle = teamNode.color;
        ctx.fill();
        ctx.strokeStyle = COLORS.BORDER;
        ctx.lineWidth = GRAPH_CONFIG.BORDER_WIDTH;
        ctx.stroke();
        teamNode.__bckgDimensions = [size, size];
      }
    },
    [loadedImages],
  );

  const renderPointerArea = useCallback(
    (node: NodeObject, color: string, ctx: CanvasRenderingContext2D) => {
      const teamNode = node as TeamGraphNode;
      const sizeW = teamNode.__bckgDimensions?.[0] ?? 30;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(node.x ?? 0, node.y ?? 0, sizeW / 2, 0, 2 * Math.PI);
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

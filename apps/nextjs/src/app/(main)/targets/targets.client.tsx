"use client";

import { use } from "react";
import {
  splashinTarget,
  splashinTeam,
  splashinUser,
} from "@splashin/db/schema";

import { TargetNetwork } from "~/components/target-network";

export function TargetsClient({
  playersWithTargets: playersWithTargetsPromise,
}: {
  playersWithTargets: Promise<
    (typeof splashinUser.$inferSelect & {
      targets: (typeof splashinTarget.$inferSelect)[];
      team: typeof splashinTeam.$inferSelect;
    })[]
  >;
}) {
  const playersWithTargets = use(playersWithTargetsPromise);

  return (
    <div>
      <TargetNetwork playersWithTargets={playersWithTargets} />
    </div>
  );
}

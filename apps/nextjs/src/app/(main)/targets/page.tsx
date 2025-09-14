import type {
  splashinTarget,
  splashinTeam,
  splashinUser,
} from "@splashin/db/schema";
import { db } from "@splashin/db/client";

import { TargetsClient } from "./targets.client";

export default function TargetsPage() {
  const targets = db.query.splashinUser.findMany({
    with: {
      targets: true,
      team: true,
    },
  }) as Promise<
    (typeof splashinUser.$inferSelect & {
      targets: (typeof splashinTarget.$inferSelect)[];
      team: typeof splashinTeam.$inferSelect;
    })[]
  >;

  return (
    <div className="!mt-0">
      <TargetsClient playersWithTargets={targets} />
    </div>
  );
}

import { db } from "@splashin/db/client";
import {
  splashinTarget,
  splashinTeam,
  splashinUser,
} from "@splashin/db/schema";

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

  return <TargetsClient playersWithTargets={targets} />;
}

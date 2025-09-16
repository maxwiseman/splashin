import type { Permissions } from "@splashin/db/types";

import { authClient } from "~/auth/client";

/**
 * React hook for checking user permissions.
 *
 * - Without arguments: returns a predicate function that accepts a list of
 *   permissions and returns true if the user has any of them (or
 *   "all-permissions").
 * - With a list: returns a boolean immediately for that list.
 *
 * Example:
 * const can = usePermissions();
 * if (can(["view-map"])) { // ... }
 * const allowed = usePermissions(["edit-location"]);
 */
export function usePermissions(): (checkList: Permissions[]) => boolean;
export function usePermissions(checkList: Permissions[]): boolean;
export function usePermissions(checkList?: Permissions[]) {
  const { data: session } = authClient.useSession();

  const evaluate = (checkList: Permissions[]) => {
    if (!session) return false;
    const userPermissions = (
      session.user as unknown as { permissions: Permissions[] }
    ).permissions;

    return userPermissions.some((permission) =>
      [...checkList, "all-permissions"].includes(permission),
    );
  };

  if (!checkList) {
    return evaluate;
  }

  return evaluate(checkList);
}

export function usePermissionsList() {
  const { data: session } = authClient.useSession();
  if (!session) return undefined;
  const userPermissions = (
    session.user as unknown as { permissions: Permissions[] }
  ).permissions;
  return userPermissions;
}

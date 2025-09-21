"use client";

import { useState } from "react";

import type { splashinTeam, splashinUser } from "@splashin/db/schema";
import { Input } from "@splashin/ui/input";

export function MapSearch({
  users,
  onUserSelect,
}: {
  users: (typeof splashinUser.$inferSelect & {
    team: typeof splashinTeam.$inferSelect;
  })[];
  onUserSelect: (userId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const filteredUsers = users.filter(
    (user) =>
      user.firstName.toLowerCase().includes(search.toLowerCase()) ||
      user.lastName.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="relative flex h-0 max-h-max grow flex-col">
      {search.length > 0 && (
        <div className="bg-background/90 divide-y overflow-y-scroll rounded-none border border-b-0 shadow-none backdrop-blur-sm">
          {filteredUsers.map((user) => (
            <div
              onClick={() => {
                onUserSelect(user.id);
                setSearch("");
              }}
              className="cursor-pointer p-2 px-3"
              key={user.id}
            >
              <div>
                {user.firstName} {user.lastName}
              </div>
              <div className="text-muted-foreground text-sm">
                {user.team.name}
              </div>
            </div>
          ))}
        </div>
      )}
      <Input
        className="bg-background/90 h-12 shrink-0 rounded-none shadow-none backdrop-blur-sm"
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>
  );
}

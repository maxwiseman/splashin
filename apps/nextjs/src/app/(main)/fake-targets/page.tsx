"use client";

import { useEffect, useState } from "react";
import { IconPower } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { Button } from "@splashin/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@splashin/ui/dialog";
import { Label } from "@splashin/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@splashin/ui/select";

import { queryClient } from "~/app/providers";
import updateFakeTargetData, { getFakeTargetData } from "./fake-target-actions";

export default function FakeTargetsPage() {
  const { data, isFetching } = useQuery({
    queryKey: ["fakeTargetData"],
    queryFn: getFakeTargetData,
  });
  const { mutate: updateData, variables } = useMutation({
    mutationFn: updateFakeTargetData,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["fakeTargetData"] }),
  });

  const [lastSelectedTeamId, setLastSelectedTeamId] = useState<string | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (typeof data === "object") {
      setLastSelectedTeamId(data.fakeTargetTeamId ?? null);
    }
  }, [data, isFetching]);

  if (data === 401) {
    return <div>Unauthorized</div>;
  }

  const optimisticData = {
    ...data,
    ...variables,
  };

  return (
    <div className="flex size-full items-center justify-center py-8">
      <div className="mb-[5.95rem] flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-1">
          <div className="text-3xl font-bold">Fake Targets</div>
          <div className="text-muted-foreground">
            {optimisticData.fakeTargetTeamId && optimisticData.teams
              ? optimisticData.teams.find(
                  (team) => team.id === optimisticData.fakeTargetTeamId,
                )?.name
              : ""}
          </div>
        </div>
        <div className="flex flex-col">
          <Button
            variant={optimisticData.fakeTargetTeamId ? "default" : "outline"}
            size="icon"
            className="size-24 border-b-0"
            onClick={() => {
              if (lastSelectedTeamId === "" || lastSelectedTeamId === null) {
                setDialogOpen(true);
                return;
              }
              if (optimisticData.fakeTargetTeamId) {
                updateData({ fakeTargetTeamId: null });
              } else {
                updateData({ fakeTargetTeamId: lastSelectedTeamId });
              }
            }}
          >
            <IconPower className="size-12" />
          </Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Edit</Button>
            </DialogTrigger>
            <DialogContent className="p-0">
              <DialogHeader className="p-6">
                <DialogTitle>Fake Targets</DialogTitle>
                <DialogDescription>
                  Show different targets in your app
                </DialogDescription>
              </DialogHeader>

              <div className="p-6 pt-0">
                <div className="flex flex-col gap-3">
                  <Label>Target Team</Label>
                  <Select
                    value={lastSelectedTeamId ?? ""}
                    onValueChange={(value) => {
                      setLastSelectedTeamId(value);
                      if (optimisticData.fakeTargetTeamId)
                        updateData({ fakeTargetTeamId: value });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a team" />
                    </SelectTrigger>
                    <SelectContent>
                      {data?.teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="bg-input/30 w-full border-t p-6 py-4">
                <Button onClick={() => setDialogOpen(false)}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

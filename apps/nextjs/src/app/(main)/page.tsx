"use client";

import { useEffect, useState } from "react";
import { IconPower } from "@tabler/icons-react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { Button } from "@splashin/ui/button";
import { DateTimePicker } from "@splashin/ui/date-picker";
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

import { useDebouncedValue } from "~/components/hooks/use-debounce";
import { usePermissions } from "~/components/hooks/use-permissions";
import { queryClient } from "../providers";
import {
  getLocationEditData,
  updateLocationEditData,
} from "./location-actions";

export default function HomePage() {
  const canEditLocation = usePermissions(["edit-location"]);
  // const [locationEnabled, setLocationEnabled] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(new Date().getTime() + 60 * 60 * 1000),
  );
  const debouncedDate = useDebouncedValue(selectedDate, 300);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ["locationEditData"],
    queryFn: getLocationEditData,
  });
  const { mutate: updateData, variables } = useMutation({
    mutationFn: updateLocationEditData,
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["locationEditData"] }),
  });

  const optimisticData = {
    ...data,
    ...variables,
  };
  const locationEnabled = optimisticData.editUntil
    ? optimisticData.editUntil.getTime() < new Date().getTime()
    : true;

  useEffect(() => {
    if (!locationEnabled)
      updateData({
        editUntil: debouncedDate,
      });
  }, [debouncedDate]);

  console.log("optimisticData", optimisticData);

  return (
    <div className="flex size-full items-center justify-center py-8">
      <div className="mb-[5.95rem] flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-1">
          <div className="text-3xl font-bold">
            {locationEnabled
              ? "Location Enabled"
              : `Location ${canEditLocation ? "Hidden" : "Paused"}`}
          </div>
          <div className="text-muted-foreground">
            {locationEnabled
              ? ""
              : `Until ${optimisticData.editUntil?.toLocaleString()}`}
          </div>
        </div>
        <div className="flex flex-col">
          <Button
            variant={locationEnabled ? "default" : "outline"}
            size="icon"
            className="size-24 border-b-0"
            onClick={() => {
              if (!locationEnabled) updateData({ editUntil: null });
              else {
                const oneHourFromNow = new Date(
                  new Date().getTime() + 60 * 60 * 1000,
                );
                const isPastDate =
                  !selectedDate ||
                  selectedDate.getTime() < new Date().getTime();
                // if (isPastDate) setSelectedDate(oneHourFromNow);
                updateData({
                  editUntil: isPastDate ? oneHourFromNow : selectedDate,
                });
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
                <DialogTitle>
                  {canEditLocation ? "Edit" : "Pause"} Location
                </DialogTitle>
                <DialogDescription>
                  {canEditLocation
                    ? "Pick your location on the map"
                    : "Hide your location from other players"}
                </DialogDescription>
              </DialogHeader>

              <div className="p-6 pt-0">
                <div className="flex flex-col gap-3">
                  <Label>{canEditLocation ? "Edit" : "Pause"} until</Label>
                  <DateTimePicker
                    showLabels={false}
                    date={
                      selectedDate ??
                      new Date(new Date().getTime() + 60 * 60 * 1000)
                    }
                    onDateChange={(newDate) => {
                      setSelectedDate(newDate);
                      // if (!locationEnabled) updateData({ editUntil: newDate });
                    }}
                  />
                </div>
              </div>
              <DialogFooter className="bg-input/30 w-full flex-row items-center !justify-between border-t p-6 py-4">
                {!canEditLocation ? (
                  <div className="text-muted-foreground text-xs">
                    Location editing unavailable
                    <br />
                    (Against the rules 🙄)
                  </div>
                ) : (
                  <div />
                )}
                <Button onClick={() => setDialogOpen(false)}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

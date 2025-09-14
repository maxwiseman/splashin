"use client";

import { useState } from "react";
import { IconPower } from "@tabler/icons-react";

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

export default function HomePage() {
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [editUntil, setEditUntil] = useState<Date | undefined>(
    new Date(new Date().getTime() + 60 * 60 * 1000),
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="flex size-full items-center justify-center py-8">
      <div className="mb-[5.95rem] flex flex-col items-center gap-8">
        <div className="text-3xl font-bold">
          {locationEnabled ? "Location Enabled" : "Location Paused"}
        </div>
        <div className="flex flex-col">
          <Button
            variant={locationEnabled ? "default" : "outline"}
            size="icon"
            className="size-24 border-b-0"
            onClick={() => setLocationEnabled(!locationEnabled)}
          >
            <IconPower className="size-12" />
          </Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Edit</Button>
            </DialogTrigger>
            <DialogContent className="p-0">
              <DialogHeader className="p-6">
                <DialogTitle>Edit Location</DialogTitle>
                <DialogDescription>
                  Pick your location on the map
                </DialogDescription>
              </DialogHeader>

              <div className="p-6 pt-0">
                <div className="flex flex-col gap-3">
                  <Label>Pause until</Label>
                  <DateTimePicker
                    showLabels={false}
                    date={editUntil}
                    onDateChange={setEditUntil}
                  />
                </div>
              </div>
              <DialogFooter className="bg-input/30 w-full flex-row items-center !justify-between border-t p-6 py-4">
                <div className="text-muted-foreground text-xs">
                  Location editing unavailable
                  <br />
                  (Against the rules 🙄)
                </div>
                <Button onClick={() => setDialogOpen(false)}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

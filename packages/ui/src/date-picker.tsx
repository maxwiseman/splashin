"use client";

import * as React from "react";
import { Calendar as CalendarIcon, ChevronDownIcon } from "lucide-react";

import { Button } from "./button";
import { Calendar } from "./calendar";
import { Input } from "./input";
import { Label } from "./label";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export function DatePicker() {
  const [date, setDate] = React.useState<Date>();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          data-empty={!date}
          className="data-[empty=true]:text-muted-foreground w-[280px] justify-start text-left font-normal"
        >
          <CalendarIcon />
          {date ? date.toLocaleDateString() : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar mode="single" selected={date} onSelect={setDate} />
      </PopoverContent>
    </Popover>
  );
}

export function DateTimePicker({
  showLabels = true,
  date: externalDate,
  onDateChange,
}: {
  showLabels?: boolean;
  date?: Date;
  onDateChange?: (date: Date | undefined) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [internalDate, setInternalDate] = React.useState<Date | undefined>(
    undefined,
  );
  const date = externalDate ?? internalDate;
  const setDate = onDateChange ?? setInternalDate;

  return (
    <div className="flex gap-4">
      <div className="flex flex-col gap-3">
        {showLabels && (
          <Label htmlFor="date-picker" className="px-1">
            Date
          </Label>
        )}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              id="date-picker"
              className="w-32 justify-between font-normal"
            >
              {date ? date.toLocaleDateString() : "Select date"}
              <ChevronDownIcon />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              captionLayout="dropdown"
              onSelect={(newDay?: Date) => {
                if (!newDay) {
                  setOpen(false);
                  return;
                }
                const next = new Date(newDay);
                if (date) {
                  next.setHours(
                    date.getHours(),
                    date.getMinutes(),
                    date.getSeconds(),
                    0,
                  );
                }
                setDate(next);
                setOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex flex-col gap-3">
        {showLabels && (
          <Label htmlFor="time-picker" className="px-1">
            Time
          </Label>
        )}
        <Input
          type="time"
          id="time-picker"
          step="1"
          value={
            date
              ? `${String(date.getHours()).padStart(2, "0")}:${String(
                  date.getMinutes(),
                ).padStart(
                  2,
                  "0",
                )}:${String(date.getSeconds()).padStart(2, "0")}`
              : ""
          }
          onChange={(e) => {
            const value = e.target.value;
            const [hoursStr, minutesStr, secondsStr] = value.split(":");
            const hours = Number(hoursStr ?? 0);
            const minutes = Number(minutesStr ?? 0);
            const seconds = Number(secondsStr ?? 0);
            const base = date ? new Date(date) : new Date();
            base.setHours(hours, minutes, seconds || 0, 0);
            setDate(base);
          }}
          className="bg-background dark:bg-input/30 cursor-text appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
        />
      </div>
    </div>
  );
}

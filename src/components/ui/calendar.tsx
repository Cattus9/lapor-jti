"use client"

import * as React from "react"
import { DayPicker, type DayPickerProps } from "react-day-picker"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "cn"

function Calendar({ className, classNames, ...props }: DayPickerProps) {
  return (
    <DayPicker
      showOutsideDays
      navLayout="around"
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "grid grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-4",
        month_caption: "col-start-2 row-start-1 flex items-center justify-center pt-1",
        caption_label: "text-sm font-medium",
        nav: "flex items-center gap-1",
        button_previous: "col-start-1 row-start-1 inline-flex size-7 items-center justify-center rounded-md p-0 text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        button_next: "col-start-3 row-start-1 inline-flex size-7 items-center justify-center rounded-md p-0 text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        month_grid: "col-span-3 row-start-2 w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday: "w-9 rounded-md text-[0.8rem] font-normal text-muted-foreground",
        week: "mt-2 flex w-full",
        day: "relative size-9 p-0 text-center text-sm focus-within:relative focus-within:z-20",
        day_button: "inline-flex size-9 items-center justify-center rounded-md p-0 font-normal hover:bg-accent hover:text-accent-foreground focus-visible:z-20 focus-visible:ring-3 focus-visible:ring-ring/50",
        selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        today: "bg-accent text-accent-foreground",
        outside: "text-muted-foreground/50",
        disabled: "text-muted-foreground/50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => orientation === "left" ? <ChevronLeft className="size-4" aria-hidden="true" /> : <ChevronRight className="size-4" aria-hidden="true" />,
      }}
      {...props}
    />
  )
}

export { Calendar }

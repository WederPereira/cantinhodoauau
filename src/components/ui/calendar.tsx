import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, CaptionProps, useNavigation } from "react-day-picker";
import { format, setMonth, setYear } from "date-fns";
import { ptBR } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function CustomCaption({ displayMonth }: CaptionProps) {
  const { goToMonth } = useNavigation();

  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(2024, i, 1);
    return { value: String(i), label: format(date, "MMMM", { locale: ptBR }) };
  });

  const years = Array.from({ length: 191 }, (_, i) => {
    const y = 1900 + i;
    return { value: String(y), label: String(y) };
  });

  const handleMonthChange = (value: string) => {
    const newDate = setMonth(displayMonth, parseInt(value));
    goToMonth(newDate);
  };

  const handleYearChange = (value: string) => {
    const newDate = setYear(displayMonth, parseInt(value));
    goToMonth(newDate);
  };

  return (
    <div className="flex items-center justify-between px-1 pt-1 pb-2">
      <Select
        value={String(displayMonth.getMonth())}
        onValueChange={handleMonthChange}
      >
        <SelectTrigger className="h-8 w-[110px] text-xs font-medium border-none shadow-none bg-muted/50 hover:bg-muted focus:ring-0 capitalize">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-60 pointer-events-auto">
          {months.map((m) => (
            <SelectItem key={m.value} value={m.value} className="capitalize text-xs">
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={String(displayMonth.getFullYear())}
        onValueChange={handleYearChange}
      >
        <SelectTrigger className="h-8 w-[80px] text-xs font-medium border-none shadow-none bg-muted/50 hover:bg-muted focus:ring-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-60 pointer-events-auto">
          {years.map((y) => (
            <SelectItem key={y.value} value={y.value} className="text-xs">
              {y.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-2 sm:p-3 pointer-events-auto", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-2",
        caption: "hidden",
        caption_label: "hidden",
        nav: "hidden",
        nav_button: "hidden",
        nav_button_previous: "hidden",
        nav_button_next: "hidden",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-8 sm:w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-1",
        cell: "h-8 w-8 sm:h-9 sm:w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 sm:h-9 sm:w-9 p-0 font-normal aria-selected:opacity-100 transition-colors"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground font-semibold",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Caption: CustomCaption,
      }}
      locale={ptBR}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };

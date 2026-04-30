import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DatePickerProps {
  /** ISO date string (yyyy-MM-dd) */
  value?: string | null;
  onChange: (isoDate: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Disable dates */
  fromDate?: Date;
  toDate?: Date;
  id?: string;
}

/** Apply dd/MM/yyyy mask while typing */
const maskDate = (raw: string) => {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

/**
 * Standardized date picker for the whole app.
 * - Stores date as ISO yyyy-MM-dd string
 * - Allows direct typing in dd/MM/yyyy with auto-mask
 * - Calendar popover for visual selection
 */
export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = "dd/mm/aaaa",
  disabled,
  className,
  fromDate,
  toDate,
  id,
}) => {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState<string>("");

  const date = React.useMemo(() => {
    if (!value) return undefined;
    const d = parse(value, "yyyy-MM-dd", new Date());
    return isValid(d) ? d : undefined;
  }, [value]);

  // Sync text field with external value
  React.useEffect(() => {
    setText(date ? format(date, "dd/MM/yyyy") : "");
  }, [date]);

  const commitText = (raw: string) => {
    const masked = maskDate(raw);
    if (masked.length === 0) {
      onChange("");
      return;
    }
    if (masked.length === 10) {
      const parsed = parse(masked, "dd/MM/yyyy", new Date());
      if (isValid(parsed)) {
        if (fromDate && parsed < fromDate) return;
        if (toDate && parsed > toDate) return;
        onChange(format(parsed, "yyyy-MM-dd"));
      }
    }
  };

  return (
    <div className={cn("relative flex items-stretch gap-1", className)}>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        disabled={disabled}
        value={text}
        onChange={(e) => {
          const masked = maskDate(e.target.value);
          setText(masked);
          if (masked.length === 10 || masked.length === 0) commitText(masked);
        }}
        onBlur={(e) => commitText(e.target.value)}
        className="h-10 flex-1 pr-10"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            className="absolute right-0 top-0 h-10 w-10 text-muted-foreground hover:text-foreground"
            aria-label="Abrir calendário"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={date}
            defaultMonth={date}
            onSelect={(d) => {
              if (d) {
                onChange(format(d, "yyyy-MM-dd"));
                setOpen(false);
              }
            }}
            fromDate={fromDate}
            toDate={toDate}
            initialFocus
            locale={ptBR}
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

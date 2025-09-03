"use client";

import { useMemo, useState } from "react";
import { Button } from "./button";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

type Props = {
  value?: string | Date | null;
  onChange?: (iso: string | null) => void;
  placeholder?: string;
  disableTime?: boolean;
};

export function DateTimePicker({ value, onChange, placeholder = "Seleccionar fecha", disableTime }: Props) {
  const [open, setOpen] = useState(false);
  const date = useMemo(() => (value ? new Date(value) : undefined), [value]);
  const [hours, setHours] = useState<number>(date ? date.getHours() : 12);
  const [minutes, setMinutes] = useState<number>(date ? date.getMinutes() : 0);

  // Keep local time selectors in sync when value changes externally
  // (e.g., when opening the editor with a pre-filled date)
  useMemo(() => {
    if (date) {
      setHours(date.getHours());
      setMinutes(date.getMinutes());
    }
  }, [date]);

  const commit = (d?: Date) => {
    if (!d) { onChange?.(null); return; }
    const merged = new Date(d);
    merged.setHours(hours, minutes, 0, 0);
    onChange?.(merged.toISOString());
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start text-left font-normal">
            {date ? date.toLocaleString() : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-3 w-auto" align="start">
          <div className="flex flex-col gap-3">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d)=> commit(d)}
            />
            {!disableTime && (
              <div className="flex items-center gap-2">
                <select className="border rounded px-2 py-1" value={hours}
                  onChange={(e)=> { const h = Number(e.target.value); setHours(h); commit(date); }}>
                  {Array.from({length:24}, (_,i)=>i).map(h=> <option key={h} value={h}>{String(h).padStart(2,"0")}</option>)}
                </select>
                :
                <select className="border rounded px-2 py-1" value={minutes}
                  onChange={(e)=> { const m = Number(e.target.value); setMinutes(m); commit(date); }}>
                  {Array.from({length:12}, (_,i)=>i*5).map(m=> <option key={m} value={m}>{String(m).padStart(2,"0")}</option>)}
                </select>
              </div>
            )}
            <div className="flex justify-end">
              <Button size="sm" onClick={()=> { commit(date); setOpen(false); }}>
                Listo
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {/* {value && (
        <Button variant="ghost" onClick={()=> onChange?.(null)}>Limpiar</Button>
      )} */}
    </div>
  );
}

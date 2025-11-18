"use client";

import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  parseInchInput,
  decimalToFraction,
  getFractionSuggestions,
} from "@/lib/fraction-utils";

interface FractionInputProps {
  value: number | "";
  onChange: (value: number | "") => void;
  placeholder?: string;
  disabled?: boolean;
}

export function FractionInput({
  value,
  onChange,
  placeholder = "0.0000",
  disabled = false,
}: FractionInputProps) {
  const [displayValue, setDisplayValue] = useState("");
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Inicializar displayValue cuando cambia value desde afuera
  useEffect(() => {
    if (value === "" || value === 0) {
      setDisplayValue("");
    } else if (typeof value === "number") {
      // Mostrar tanto decimal como fracción
      const fraction = decimalToFraction(value);
      setDisplayValue(fraction || value.toFixed(4));
    }
  }, [value]);

  const handleInputChange = (text: string) => {
    setDisplayValue(text);

    // Buscar fracciones sugeridas
    if (text.trim()) {
      const sugs = getFractionSuggestions(text);
      setSuggestions(sugs);
      setOpen(sugs.length > 0);
    } else {
      setSuggestions([]);
      setOpen(false);
    }
  };

  const handleConfirmInput = () => {
    if (displayValue.trim() === "") {
      onChange("");
      setDisplayValue("");
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const decimal = parseInchInput(displayValue);
    if (decimal !== null) {
      onChange(decimal);
      // Mostrar fracción formateada
      const fraction = decimalToFraction(decimal);
      setDisplayValue(fraction || decimal.toFixed(4));
      setSuggestions([]);
      setOpen(false);
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    const decimal = parseInchInput(suggestion);
    if (decimal !== null) {
      onChange(decimal);
      setDisplayValue(suggestion);
      setSuggestions([]);
      setOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirmInput();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            ref={inputRef}
            type="text"
            value={displayValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onBlur={handleConfirmInput}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (displayValue.trim() && suggestions.length > 0) {
                setOpen(true);
              }
            }}
            placeholder={placeholder}
            disabled={disabled}
            className="text-right font-mono"
          />
          {value !== "" && value !== 0 && (
            <Badge
              variant="secondary"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs cursor-default pointer-events-none"
            >
              {decimalToFraction(value as number) || (value as number).toFixed(4)}
            </Badge>
          )}
        </div>
      </PopoverTrigger>

      {suggestions.length > 0 && (
        <PopoverContent className="w-48 p-0" align="start">
          <Command>
            <CommandEmpty>Sin coincidencias</CommandEmpty>
            <CommandGroup heading="Fracciones sugeridas">
              {suggestions.map((suggestion) => (
                <CommandItem
                  key={suggestion}
                  onSelect={() => handleSelectSuggestion(suggestion)}
                  className="cursor-pointer"
                >
                  <span className="font-mono">{suggestion}&quot;</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({parseInchInput(suggestion)?.toFixed(4)})
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      )}
    </Popover>
  );
}

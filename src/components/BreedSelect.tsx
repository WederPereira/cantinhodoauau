import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { DOG_BREEDS } from '@/data/dogBreeds';
import { cn } from '@/lib/utils';

interface BreedSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const BreedSelect: React.FC<BreedSelectProps> = ({
  value,
  onChange,
  placeholder = "Pesquisar raça...",
  className,
}) => {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isCustom, setIsCustom] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Detect if current value is custom (not in breed list and not empty)
  useEffect(() => {
    if (value && !DOG_BREEDS.includes(value)) {
      setIsCustom(true);
    }
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return DOG_BREEDS;
    const q = search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return DOG_BREEDS.filter(b =>
      b.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)
    );
  }, [search]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (breed: string) => {
    onChange(breed);
    setSearch('');
    setIsOpen(false);
    setIsCustom(false);
  };

  const handleOther = () => {
    setIsCustom(true);
    setIsOpen(false);
    setSearch('');
    onChange('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleClear = () => {
    onChange('');
    setSearch('');
    setIsCustom(false);
    inputRef.current?.focus();
  };

  if (isCustom) {
    return (
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Digite a raça..."
          className={cn("h-11 pr-8", className)}
        />
        <button
          type="button"
          onClick={() => { setIsCustom(false); onChange(''); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={isOpen ? search : value}
          onChange={(e) => { setSearch(e.target.value); if (!isOpen) setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          placeholder={value || placeholder}
          className={cn("h-11 pl-9 pr-8", !isOpen && value && "text-foreground", className)}
        />
        {value && !isOpen && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filtered.length > 0 ? (
            filtered.map((breed) => (
              <button
                key={breed}
                type="button"
                onClick={() => handleSelect(breed)}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                  value === breed && "bg-accent/50 font-medium"
                )}
              >
                {breed}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">Nenhuma raça encontrada</div>
          )}
          <button
            type="button"
            onClick={handleOther}
            className="w-full text-left px-3 py-2 text-sm font-medium border-t border-border text-primary hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            🐾 Outros (digitar manualmente)
          </button>
        </div>
      )}
    </div>
  );
};

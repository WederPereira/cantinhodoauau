import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Check, X, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineEditFieldProps {
  value: string;
  onSave: (value: string) => void;
  label: string;
  icon?: React.ReactNode;
  placeholder?: string;
  type?: string;
  className?: string;
  action?: React.ReactNode;
  onCopy?: () => void;
}

export const InlineEditField: React.FC<InlineEditFieldProps> = ({
  value,
  onSave,
  label,
  icon,
  placeholder,
  type = 'text',
  className,
  action,
  onCopy,
}) => {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = () => {
    onSave(editValue.trim());
    setEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  if (editing) {
    return (
      <div className={cn("flex items-center gap-2 p-2 bg-primary/5 rounded-lg border border-primary/20 animate-in fade-in duration-150", className)}>
        {icon && <div className="text-primary flex-shrink-0">{icon}</div>}
        <div className="flex-1 min-w-0">
          <p className="text-[9px] text-primary uppercase tracking-wider font-medium mb-0.5">{label}</p>
          <Input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            type={type}
            placeholder={placeholder}
            className="h-7 text-sm border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button onMouseDown={(e) => { e.preventDefault(); handleSave(); }} className="p-1 rounded hover:bg-primary/10 text-primary transition-colors">
            <Check size={14} />
          </button>
          <button onMouseDown={(e) => { e.preventDefault(); handleCancel(); }} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-2.5 rounded-lg group cursor-pointer hover:bg-muted/30 transition-all",
        className
      )}
      onClick={() => setEditing(true)}
    >
      {icon && <div className="text-muted-foreground flex-shrink-0">{icon}</div>}
      <div className="flex-1 min-w-0">
        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className={cn("text-sm font-medium truncate", !value && "text-muted-foreground/50 italic")}>
          {value || placeholder || 'Toque para editar'}
        </p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {action}
        <Pencil size={11} className="text-muted-foreground/30 group-hover:text-primary transition-colors" />
      </div>
    </div>
  );
};

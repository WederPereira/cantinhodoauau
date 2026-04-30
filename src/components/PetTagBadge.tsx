import React from 'react';
import { PetTag } from '@/types/petTag';
import { cn } from '@/lib/utils';
import { Sparkles, X } from 'lucide-react';

interface Props {
  tag: PetTag;
  size?: 'xs' | 'sm';
  onRemove?: () => void;
  className?: string;
}

export const PetTagBadge: React.FC<Props> = ({ tag, size = 'xs', onRemove, className }) => {
  const isAuto = tag.auto_kind === 'new_pet';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-semibold text-white shadow-sm whitespace-nowrap',
        size === 'xs' ? 'text-[9px] px-1.5 py-0.5' : 'text-[11px] px-2 py-0.5',
        className,
      )}
      style={{ backgroundColor: tag.color }}
    >
      {isAuto && <Sparkles size={size === 'xs' ? 8 : 10} />}
      {tag.label}
      {onRemove && !isAuto && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="ml-0.5 hover:opacity-80"
          aria-label="Remover etiqueta"
        >
          <X size={size === 'xs' ? 8 : 10} />
        </button>
      )}
    </span>
  );
};

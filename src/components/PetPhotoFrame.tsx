import React from 'react';
import { cn } from '@/lib/utils';
import { usePetTags } from '@/hooks/usePetTags';
import { useClients } from '@/context/ClientContext';
import { Sparkles } from 'lucide-react';
import { PetTagBadge } from '@/components/PetTagBadge';

interface PetPhotoFrameProps {
  clientId?: string | null;
  /** Fallback identification when clientId is not directly available */
  dogName?: string;
  tutorName?: string;
  photoUrl?: string | null;
  alt?: string;
  className?: string;
  /** Image fit and rounding controlled by container className */
  rounded?: 'full' | 'xl' | '2xl' | 'lg' | 'md';
  /** Ring thickness in px. Defaults to 4 */
  ringWidth?: number;
  /** Show small "new" sparkle indicator at top-right */
  showNewBadge?: boolean;
  /** Render visible tag badges over the photo */
  showTagBadges?: boolean;
  /** Position of tag badges. Defaults to top-left */
  badgePosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Max badges to show before "+N" */
  maxBadges?: number;
  /** Render this when there's no photo */
  fallback?: React.ReactNode;
  onClick?: () => void;
  children?: React.ReactNode;
}

/**
 * Reusable photo frame with colored border driven by pet tags.
 * - Visible double-ring (outer color + inner white) so it pops on any background
 * - Tag badges overlay on top of the photo for instant identification
 * - Use anywhere a pet photo is shown so the visual signal is consistent
 */
export const PetPhotoFrame: React.FC<PetPhotoFrameProps> = ({
  clientId,
  dogName,
  tutorName,
  photoUrl,
  alt,
  className,
  rounded = 'full',
  ringWidth = 4,
  showNewBadge = true,
  showTagBadges = true,
  badgePosition = 'top-left',
  maxBadges = 2,
  fallback,
  onClick,
  children,
}) => {
  const { clients } = useClients();

  // Resolve client from id or by name/tutor (legacy data)
  const resolved = React.useMemo(() => {
    if (clientId) return clients.find(c => c.id === clientId) || null;
    if (dogName) {
      return (
        clients.find(c => c.name === dogName && c.tutorName === tutorName) ||
        clients.find(c => c.name === dogName) ||
        null
      );
    }
    return null;
  }, [clients, clientId, dogName, tutorName]);

  const entryMap = React.useMemo(
    () => (resolved ? { [resolved.id]: resolved.entryDate } : {}),
    [resolved],
  );
  const { getEffectiveTags } = usePetTags(entryMap);
  const tags = resolved ? getEffectiveTags(resolved.id) : [];

  // Sort: auto "new" first, then others
  const sortedTags = React.useMemo(() => {
    const newTags = tags.filter(t => t.auto_kind === 'new_pet');
    const others = tags.filter(t => t.auto_kind !== 'new_pet');
    return [...newTags, ...others];
  }, [tags]);

  const dominant = sortedTags[0];
  const ringColor = dominant?.color;
  const isNew = tags.some(t => t.auto_kind === 'new_pet');

  const roundedClass = {
    full: 'rounded-full',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    lg: 'rounded-lg',
    md: 'rounded-md',
  }[rounded];

  const photo = photoUrl ?? resolved?.photo;

  // Double-ring: outer colored + inner light separator for visibility on any photo
  const ringStyle: React.CSSProperties | undefined = ringColor
    ? {
        boxShadow: `0 0 0 ${ringWidth}px ${ringColor}, inset 0 0 0 1.5px rgba(255,255,255,0.85)`,
      }
    : undefined;

  const positionClass = {
    'top-left': 'top-1.5 left-1.5 items-start',
    'top-right': 'top-1.5 right-1.5 items-end',
    'bottom-left': 'bottom-1.5 left-1.5 items-start',
    'bottom-right': 'bottom-1.5 right-1.5 items-end',
  }[badgePosition];

  return (
    <div
      onClick={onClick}
      className={cn('relative overflow-visible bg-muted', roundedClass, className)}
      style={ringStyle}
    >
      <div className={cn('absolute inset-0 overflow-hidden', roundedClass)}>
        {photo ? (
          <img
            src={photo}
            alt={alt || resolved?.name || dogName || ''}
            className="w-full h-full object-cover"
          />
        ) : (
          fallback ?? (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground/50 text-sm font-semibold">
              {(resolved?.name || dogName || '?').charAt(0).toUpperCase()}
            </div>
          )
        )}
      </div>

      {/* Tag badges overlay */}
      {showTagBadges && sortedTags.length > 0 && (
        <div className={cn('absolute z-20 flex flex-col gap-1 max-w-[85%] pointer-events-none', positionClass)}>
          {sortedTags.slice(0, maxBadges).map(t => (
            <PetTagBadge key={t.id} tag={t} size="xs" className="shadow-md ring-1 ring-white/40" />
          ))}
          {sortedTags.length > maxBadges && (
            <span className="text-[9px] font-bold bg-card/95 text-foreground px-1.5 py-0.5 rounded-full shadow-md">
              +{sortedTags.length - maxBadges}
            </span>
          )}
        </div>
      )}

      {/* Small sparkle corner indicator for "new" (only if badges hidden) */}
      {!showTagBadges && showNewBadge && isNew && (
        <span
          className="absolute -top-1 -right-1 z-20 bg-green-500 text-white rounded-full p-1 shadow-md ring-2 ring-card"
          title="Novo na creche"
          aria-label="Novo"
        >
          <Sparkles size={10} />
        </span>
      )}

      {children}
    </div>
  );
};

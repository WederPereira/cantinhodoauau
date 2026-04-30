import React from 'react';
import { cn } from '@/lib/utils';
import { usePetTags } from '@/hooks/usePetTags';
import { useClients } from '@/context/ClientContext';
import { Sparkles } from 'lucide-react';

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
  /** Ring thickness in px. Defaults to 3 */
  ringWidth?: number;
  /** Show small "new" sparkle indicator at top-right */
  showNewBadge?: boolean;
  /** Render this when there's no photo */
  fallback?: React.ReactNode;
  onClick?: () => void;
  children?: React.ReactNode;
}

/**
 * Reusable photo frame with colored border driven by pet tags.
 * - The ring color matches the dominant active tag (priority: "Novo" auto tag, then first manual)
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
  ringWidth = 3,
  showNewBadge = true,
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

  const dominant =
    tags.find(t => t.auto_kind === 'new_pet') || tags[0];
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

  return (
    <div
      onClick={onClick}
      className={cn('relative overflow-hidden bg-muted', roundedClass, className)}
      style={
        ringColor
          ? { boxShadow: `inset 0 0 0 ${ringWidth}px ${ringColor}` }
          : undefined
      }
    >
      {photo ? (
        <img src={photo} alt={alt || resolved?.name || dogName || ''} className="w-full h-full object-cover" />
      ) : (
        fallback ?? (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/50 text-sm font-semibold">
            {(resolved?.name || dogName || '?').charAt(0).toUpperCase()}
          </div>
        )
      )}

      {showNewBadge && isNew && (
        <span
          className="absolute top-0.5 right-0.5 bg-green-500 text-white rounded-full p-0.5 shadow"
          title="Novo na creche"
          aria-label="Novo"
        >
          <Sparkles size={9} />
        </span>
      )}

      {children}
    </div>
  );
};

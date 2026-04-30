import React, { useState } from 'react';
import { Client } from '@/types/client';
import { PetTag, TAG_COLORS, TAG_DURATIONS } from '@/types/petTag';
import { usePetTags } from '@/hooks/usePetTags';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PetTagBadge } from '@/components/PetTagBadge';
import { Plus, Tag as TagIcon, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  client: Client;
}

/** Block to manage tags inside the ClientDetailSheet */
export const PetTagsManager: React.FC<Props> = ({ client }) => {
  const entryMap = { [client.id]: client.entryDate };
  const { getEffectiveTags, addTag, deleteTag } = usePetTags(entryMap);
  const tags = getEffectiveTags(client.id);

  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState('');
  const [color, setColor] = useState(TAG_COLORS[0].value);
  const [duration, setDuration] = useState<number>(60);

  const handleCreate = async () => {
    if (!label.trim()) return;
    const ok = await addTag(client.id, label.trim(), color, duration);
    if (ok) {
      setLabel('');
      setColor(TAG_COLORS[0].value);
      setDuration(60);
      setCreating(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-sm">
          <TagIcon size={14} className="text-primary" /> Etiquetas
        </Label>
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setCreating(v => !v)}>
          <Plus size={12} /> Nova
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {tags.length === 0 && !creating && (
          <span className="text-xs text-muted-foreground italic">Nenhuma etiqueta</span>
        )}
        {tags.map(t => (
          <PetTagBadge
            key={t.id}
            tag={t}
            size="sm"
            onRemove={t.auto_kind ? undefined : () => deleteTag(t.id)}
          />
        ))}
      </div>

      {creating && (
        <div className="rounded-lg border border-border bg-card/50 p-3 space-y-2">
          <Input
            placeholder="Nome da etiqueta (ex.: Reativo, Idoso, VIP)"
            value={label}
            onChange={(e) => setLabel(e.target.value.slice(0, 24))}
            maxLength={24}
            autoFocus
          />
          <div>
            <Label className="text-xs">Cor</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {TAG_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={cn(
                    'w-6 h-6 rounded-full border-2 transition-all',
                    color === c.value ? 'border-foreground scale-110' : 'border-transparent',
                  )}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs">Validade</Label>
            <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TAG_DURATIONS.map(d => (
                  <SelectItem key={d.days} value={String(d.days)}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {label.trim() && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground">Prévia:</span>
              <PetTagBadge
                tag={{
                  id: 'preview', client_id: '', label: label.trim(), color,
                  created_by_name: '', created_at: '', updated_at: '',
                } as PetTag}
                size="sm"
              />
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="ghost" className="flex-1" onClick={() => setCreating(false)}>
              Cancelar
            </Button>
            <Button size="sm" className="flex-1" onClick={handleCreate} disabled={!label.trim()}>
              Adicionar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

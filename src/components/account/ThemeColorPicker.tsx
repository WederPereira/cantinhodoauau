import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Palette, Check } from 'lucide-react';
import { useThemeColor } from '@/hooks/useThemeColor';
import { toast } from 'sonner';

const ThemeColorPicker: React.FC = () => {
  const { themeId, setTheme, presets } = useThemeColor();

  const handlePick = (id: string, name: string) => {
    setTheme(id);
    toast.success(`Tema aplicado: ${name}`);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Palette className="w-4 h-4 text-primary" /> Cor do Tema
        </CardTitle>
        <CardDescription className="text-xs">
          Escolha a cor principal do app. A escolha fica salva neste dispositivo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-3">
          {presets.map(p => {
            const active = themeId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePick(p.id, p.name)}
                className={`group relative flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${
                  active
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-primary/40 hover:bg-muted/40'
                }`}
                aria-label={`Aplicar tema ${p.name}`}
              >
                <span
                  className="relative w-10 h-10 rounded-full shadow-md ring-2 ring-background"
                  style={{ backgroundImage: p.swatch }}
                >
                  {active && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white drop-shadow" strokeWidth={3} />
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-medium text-foreground text-center leading-tight">
                  {p.name}
                </span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default ThemeColorPicker;

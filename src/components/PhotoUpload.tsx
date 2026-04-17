import React, { useRef, useState, useCallback } from 'react';
import { Camera, X, Loader2, Check, RotateCcw } from 'lucide-react';
import Cropper, { Area } from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PhotoUploadProps {
  photo?: string;
  onPhotoChange: (photo: string | undefined) => void | Promise<void>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  maxDimension?: number;
  quality?: number;
  /** Aspect ratio for cropping. Default 1 (square). Use 4/3 for landscape. */
  aspect?: number;
  /** Disable the crop dialog and upload original (after compression). */
  disableCrop?: boolean;
}

const readFileAsDataURL = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const cropImageToBlob = (
  imageSrc: string,
  cropArea: Area,
  maxDim: number,
  quality: number
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let outW = cropArea.width;
      let outH = cropArea.height;
      if (outW > maxDim || outH > maxDim) {
        if (outW > outH) {
          outH = Math.round((outH * maxDim) / outW);
          outW = maxDim;
        } else {
          outW = Math.round((outW * maxDim) / outH);
          outH = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context unavailable'));
      ctx.drawImage(
        img,
        cropArea.x, cropArea.y, cropArea.width, cropArea.height,
        0, 0, outW, outH
      );
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Crop failed'))),
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageSrc;
  });

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  photo,
  onPhotoChange,
  size = 'md',
  className,
  maxDimension = 1200,
  quality = 0.85,
  aspect = 1,
  disableCrop = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;

    if (disableCrop) {
      setUploading(true);
      try {
        const dataUrl = await readFileAsDataURL(file);
        const fakeArea: Area = { x: 0, y: 0, width: 0, height: 0 };
        // upload original via canvas (for compression) — load into image first
        const img = new Image();
        img.src = dataUrl;
        await new Promise<void>((res) => { img.onload = () => res(); });
        fakeArea.width = img.width;
        fakeArea.height = img.height;
        const blob = await cropImageToBlob(dataUrl, fakeArea, maxDimension, quality);
        await uploadBlob(blob);
      } catch (err) {
        console.error(err);
        toast.error('Erro ao processar foto');
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = '';
      }
      return;
    }

    try {
      const dataUrl = await readFileAsDataURL(file);
      setImageSrc(dataUrl);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCropOpen(true);
    } catch (err) {
      toast.error('Erro ao carregar imagem');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const uploadBlob = async (blob: Blob) => {
    const path = `pets/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: false,
    });
    if (upErr) throw upErr;
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
    await onPhotoChange(urlData.publicUrl);
  };

  const handleConfirmCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setUploading(true);
    try {
      const blob = await cropImageToBlob(imageSrc, croppedAreaPixels, maxDimension, quality);
      await uploadBlob(blob);
      setCropOpen(false);
      setImageSrc(null);
      toast.success('Foto enquadrada e salva!');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Erro ao enviar foto');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setUploading(true);
    try {
      if (photo && photo.includes('/avatars/')) {
        const parts = photo.split('/avatars/');
        const filePath = parts[parts.length - 1];
        const { error } = await supabase.storage.from('avatars').remove([filePath]);
        if (error) console.error('Error removing photo from storage:', error);
      }
      await onPhotoChange(undefined);
    } catch (err) {
      console.error('Error removing photo:', err);
      toast.error('Erro ao apagar foto');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleReframe = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!photo) return;
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error('load'));
        img.src = photo;
      });
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setImageSrc(dataUrl);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCropOpen(true);
    } catch {
      toast.error('Não foi possível carregar a foto para enquadrar');
    }
  };

  return (
    <div className={cn('relative', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        className={cn(
          sizeClasses[size],
          'rounded-full border-2 border-dashed border-border',
          'flex items-center justify-center cursor-pointer',
          'hover:border-primary hover:bg-primary/5 transition-colors',
          'overflow-hidden',
          photo && 'border-solid border-primary',
          uploading && 'opacity-60 cursor-wait'
        )}
      >
        {uploading ? (
          <Loader2 className="animate-spin text-muted-foreground" size={size === 'sm' ? 20 : size === 'md' ? 28 : 36} />
        ) : photo ? (
          <img src={photo} alt="Pet" className="w-full h-full object-cover" />
        ) : (
          <Camera className="text-muted-foreground" size={size === 'sm' ? 20 : size === 'md' ? 28 : 36} />
        )}
      </div>
      {photo && !uploading && !disableCrop && (
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full shadow-md"
          onClick={handleReframe}
          title="Reenquadrar foto"
        >
          <RotateCcw size={12} />
        </Button>
      )}
      {photo && !uploading && (
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="absolute -top-1 -right-1 h-6 w-6 rounded-full"
          onClick={handleRemove}
        >
          <X size={14} />
        </Button>
      )}

      <Dialog open={cropOpen} onOpenChange={(o) => { if (!uploading) setCropOpen(o); }}>
        <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-lg p-0 overflow-hidden gap-0">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle>Enquadrar foto</DialogTitle>
          </DialogHeader>
          <div className="relative w-full bg-black aspect-square">
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                cropShape="round"
                showGrid={false}
              />
            )}
          </div>
          <div className="px-5 py-4 space-y-3 border-t border-border">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-10">Zoom</span>
              <Slider
                min={1}
                max={3}
                step={0.05}
                value={[zoom]}
                onValueChange={(v) => setZoom(v[0])}
                className="flex-1"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => { setZoom(1); setCrop({ x: 0, y: 0 }); }}
                className="h-8 w-8"
              >
                <RotateCcw size={14} />
              </Button>
            </div>
          </div>
          <DialogFooter className="px-5 pb-5 gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => setCropOpen(false)} disabled={uploading}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleConfirmCrop} disabled={uploading} className="gap-2">
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Salvar enquadramento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

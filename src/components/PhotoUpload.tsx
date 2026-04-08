import React, { useRef, useState } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PhotoUploadProps {
  photo?: string;
  onPhotoChange: (photo: string | undefined) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Max dimension (width or height) for compression. Default 1200px */
  maxDimension?: number;
  /** JPEG quality 0-1. Default 0.85 */
  quality?: number;
}

const compressImage = (file: File, maxDim: number, quality: number): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Compression failed'))),
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
};

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  photo,
  onPhotoChange,
  size = 'md',
  className,
  maxDimension = 1200,
  quality = 0.85,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;

    setUploading(true);
    try {
      const compressed = await compressImage(file, maxDimension, quality);
      const path = `pets/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, compressed, {
        contentType: 'image/jpeg',
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      onPhotoChange(urlData.publicUrl);
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error('Erro ao enviar foto');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (photo && photo.includes('/avatars/')) {
      try {
        const parts = photo.split('/avatars/');
        const filePath = parts[parts.length - 1];
        await supabase.storage.from('avatars').remove([filePath]);
      } catch (err) {
        console.error('Error removing photo:', err);
      }
    }
    onPhotoChange(null as unknown as string | undefined);
    if (inputRef.current) inputRef.current.value = '';
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
    </div>
  );
};

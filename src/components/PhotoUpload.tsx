import React, { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { deleteClientPhoto, uploadClientPhoto } from '@/lib/clientPhotoStorage';

interface PhotoUploadProps {
  photo?: string;
  onPhotoChange: (photo: string | undefined) => void;
  onRemovePhoto?: () => void;
  onUploadingChange?: (uploading: boolean) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  maxSizeMb?: number;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  photo,
  onPhotoChange,
  onRemovePhoto,
  onUploadingChange,
  size = 'md',
  className,
  maxSizeMb = 10,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | undefined>(photo);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setPreviewPhoto(photo);
  }, [photo]);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  const updateUploadingState = (nextValue: boolean) => {
    setUploading(nextValue);
    onUploadingChange?.(nextValue);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Selecione apenas arquivos de imagem');
      e.target.value = '';
      return;
    }

    if (file.size > maxSizeMb * 1024 * 1024) {
      toast.error(`A foto deve ter no máximo ${maxSizeMb}MB`);
      e.target.value = '';
      return;
    }

    const temporaryPreview = URL.createObjectURL(file);
    setPreviewPhoto(temporaryPreview);
    updateUploadingState(true);

    try {
      const uploadedPhotoUrl = await uploadClientPhoto(file, photo);
      setPreviewPhoto(uploadedPhotoUrl);
      onPhotoChange(uploadedPhotoUrl);
      toast.success('Foto enviada com sucesso');
    } catch (error) {
      console.error('Erro ao enviar foto:', error);
      setPreviewPhoto(photo);
      toast.error('Não foi possível enviar a foto');
    } finally {
      URL.revokeObjectURL(temporaryPreview);
      updateUploadingState(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (uploading) return;

    const previousPhoto = photo;
    setPreviewPhoto(undefined);

    try {
      if (previousPhoto) {
        await deleteClientPhoto(previousPhoto);
      }

      if (onRemovePhoto) {
        onRemovePhoto();
      } else {
        onPhotoChange(undefined);
      }
    } catch (error) {
      console.error('Erro ao remover foto:', error);
      setPreviewPhoto(previousPhoto);
      toast.error('Não foi possível remover a foto');
    } finally {
      if (inputRef.current) {
        inputRef.current.value = '';
      }
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
          'relative rounded-full border-2 border-dashed border-border',
          'flex items-center justify-center',
          'hover:border-primary hover:bg-primary/5 transition-colors',
          'overflow-hidden',
          uploading ? 'cursor-wait opacity-90' : 'cursor-pointer',
          previewPhoto && 'border-solid border-primary'
        )}
      >
        {previewPhoto ? (
          <img
            src={previewPhoto}
            alt="Pet"
            className="w-full h-full object-cover"
          />
        ) : (
          <Camera className="text-muted-foreground" size={size === 'sm' ? 20 : size === 'md' ? 28 : 36} />
        )}

        {uploading && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
            <Loader2 className="animate-spin text-primary" size={size === 'sm' ? 18 : 24} />
          </div>
        )}
      </div>
      {previewPhoto && (
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="absolute -top-1 -right-1 h-6 w-6 rounded-full"
          onClick={handleRemove}
          disabled={uploading}
        >
          <X size={14} />
        </Button>
      )}
    </div>
  );
};

import React, { useRef } from 'react';
import { Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PhotoUploadProps {
  photo?: string;
  onPhotoChange: (photo: string | undefined) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  photo,
  onPhotoChange,
  size = 'md',
  className,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      // Compress image if too large
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 200;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', 0.8);
        onPhotoChange(compressed);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onPhotoChange(undefined);
    if (inputRef.current) {
      inputRef.current.value = '';
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
        onClick={() => inputRef.current?.click()}
        className={cn(
          sizeClasses[size],
          'rounded-full border-2 border-dashed border-border',
          'flex items-center justify-center cursor-pointer',
          'hover:border-primary hover:bg-primary/5 transition-colors',
          'overflow-hidden',
          photo && 'border-solid border-primary'
        )}
      >
        {photo ? (
          <img
            src={photo}
            alt="Pet"
            className="w-full h-full object-cover"
          />
        ) : (
          <Camera className="text-muted-foreground" size={size === 'sm' ? 20 : size === 'md' ? 28 : 36} />
        )}
      </div>
      {photo && (
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
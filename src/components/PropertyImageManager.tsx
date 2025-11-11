import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import imageCompression from 'browser-image-compression';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Upload, GripVertical, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ImageItem {
  id: string;
  url: string;
  file?: File;
  isUploaded: boolean;
}

interface PropertyImageManagerProps {
  propertyId?: string;
  initialImages?: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
}

const SortableImage = ({ image, onRemove }: { image: ImageItem; onRemove: () => void }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group rounded-lg overflow-hidden bg-muted aspect-square"
    >
      <img
        src={image.url}
        alt="Property"
        className="w-full h-full object-cover"
      />
      
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 cursor-grab active:cursor-grabbing bg-background/80 rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Remove Button */}
      <Button
        type="button"
        variant="destructive"
        size="icon"
        className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>

      {!image.isUploaded && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <Loader2 className="h-6 w-6 text-white animate-spin" />
        </div>
      )}
    </div>
  );
};

export const PropertyImageManager = ({
  propertyId,
  initialImages = [],
  onImagesChange,
  maxImages = 10,
}: PropertyImageManagerProps) => {
  const [images, setImages] = useState<ImageItem[]>(
    initialImages.map((url, index) => ({
      id: `existing-${index}`,
      url,
      isUploaded: true,
    }))
  );
  const [uploading, setUploading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const compressImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    };

    try {
      const compressedFile = await imageCompression(file, options);
      return compressedFile;
    } catch (error) {
      console.error('Error compressing image:', error);
      return file;
    }
  };

  const uploadToStorage = async (file: File): Promise<string | null> => {
    try {
      const compressedFile = await compressImage(file);
      const fileExt = file.name.split('.').pop();
      const fileName = `${propertyId || 'temp'}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('property-images')
        .upload(filePath, compressedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('property-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Erreur lors de l\'upload de l\'image');
      return null;
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (images.length + acceptedFiles.length > maxImages) {
      toast.error(`Maximum ${maxImages} images autorisées`);
      return;
    }

    setUploading(true);

    // Create temporary preview URLs
    const newImages: ImageItem[] = acceptedFiles.map((file, index) => ({
      id: `new-${Date.now()}-${index}`,
      url: URL.createObjectURL(file),
      file,
      isUploaded: false,
    }));

    setImages(prev => [...prev, ...newImages]);

    // Upload images
    const uploadPromises = newImages.map(async (imageItem) => {
      if (imageItem.file) {
        const uploadedUrl = await uploadToStorage(imageItem.file);
        if (uploadedUrl) {
          setImages(prev =>
            prev.map(img =>
              img.id === imageItem.id
                ? { ...img, url: uploadedUrl, isUploaded: true }
                : img
            )
          );
          return uploadedUrl;
        }
      }
      return null;
    });

    const uploadedUrls = await Promise.all(uploadPromises);
    const validUrls = uploadedUrls.filter((url): url is string => url !== null);

    setUploading(false);

    if (validUrls.length > 0) {
      toast.success(`${validUrls.length} image(s) ajoutée(s)`);
      // Update parent with all uploaded image URLs
      const allUploadedUrls = images
        .filter(img => img.isUploaded)
        .map(img => img.url)
        .concat(validUrls);
      onImagesChange(allUploadedUrls);
    }
  }, [images, maxImages, onImagesChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
    },
    maxFiles: maxImages - images.length,
    disabled: uploading || images.length >= maxImages,
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setImages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Update parent with reordered URLs
        const uploadedUrls = newItems
          .filter(img => img.isUploaded)
          .map(img => img.url);
        onImagesChange(uploadedUrls);
        
        return newItems;
      });
    }
  };

  const removeImage = async (imageItem: ImageItem) => {
    // If it's an uploaded image, try to delete from storage
    if (imageItem.isUploaded && imageItem.url.includes('property-images')) {
      try {
        const urlParts = imageItem.url.split('/property-images/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1].split('?')[0];
          await supabase.storage.from('property-images').remove([filePath]);
        }
      } catch (error) {
        console.error('Error deleting image:', error);
      }
    }

    const newImages = images.filter(img => img.id !== imageItem.id);
    setImages(newImages);
    
    const uploadedUrls = newImages
      .filter(img => img.isUploaded)
      .map(img => img.url);
    onImagesChange(uploadedUrls);
    
    toast.success('Image supprimée');
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      {images.length < maxImages && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          {isDragActive ? (
            <p className="text-primary">Déposez les images ici...</p>
          ) : (
            <div>
              <p className="text-foreground mb-2">
                Glissez-déposez des images ici, ou cliquez pour sélectionner
              </p>
              <p className="text-sm text-muted-foreground">
                Maximum {maxImages} images • Compression automatique
              </p>
              <p className="text-sm text-muted-foreground">
                {images.length}/{maxImages} images
              </p>
            </div>
          )}
        </div>
      )}

      {/* Image Grid with Drag & Drop */}
      {images.length > 0 && (
        <div>
          <p className="text-sm text-muted-foreground mb-3">
            Glissez-déposez pour réorganiser les images
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={images.map(img => img.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {images.map((image) => (
                  <SortableImage
                    key={image.id}
                    image={image}
                    onRemove={() => removeImage(image)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
};

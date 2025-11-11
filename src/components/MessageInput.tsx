import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Send, Paperclip, Smile, X, FileText, Image as ImageIcon } from 'lucide-react';
import { EmojiPicker } from '@/components/EmojiPicker';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import imageCompression from 'browser-image-compression';

interface MessageInputProps {
  conversationId: string;
  onSend: (content: string, fileUrl?: string, fileType?: string, fileName?: string) => Promise<void>;
  onTyping: () => void;
}

export const MessageInput = ({ conversationId, onSend, onTyping }: MessageInputProps) => {
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Check file size (20MB max)
    if (selectedFile.size > 20 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Fichier trop volumineux",
        description: "La taille maximale est de 20 MB"
      });
      return;
    }

    // Compress image if it's an image
    if (selectedFile.type.startsWith('image/')) {
      try {
        const compressed = await imageCompression(selectedFile, {
          maxSizeMB: 2,
          maxWidthOrHeight: 1920,
          useWebWorker: true
        });
        setFile(new File([compressed], selectedFile.name, { type: compressed.type }));
      } catch (error) {
        console.error('Error compressing image:', error);
        setFile(selectedFile);
      }
    } else {
      setFile(selectedFile);
    }
  };

  const uploadFile = async (file: File, messageId: string) => {
    const fileExt = file.name.split('.').pop();
    const filePath = `${conversationId}/${messageId}/${Date.now()}.${fileExt}`;

    const { error: uploadError, data } = await supabase.storage
      .from('message-attachments')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('message-attachments')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && !file) || uploading) return;

    setUploading(true);
    try {
      let fileUrl: string | undefined;
      let fileType: string | undefined;
      let fileName: string | undefined;

      if (file) {
        // Create temporary message ID for file path
        const tempId = crypto.randomUUID();
        fileUrl = await uploadFile(file, tempId);
        fileType = file.type;
        fileName = file.name;
      }

      await onSend(message.trim() || '📎 Fichier joint', fileUrl, fileType, fileName);
      setMessage('');
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Impossible d'envoyer le message"
      });
      console.error('Error sending message:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setMessage(prev => prev + emoji);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    onTyping();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {file && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
          {file.type.startsWith('image/') ? (
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          ) : (
            <FileText className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm flex-1 truncate">{file.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setFile(null);
              if (fileInputRef.current) {
                fileInputRef.current.value = '';
              }
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf,.doc,.docx"
          onChange={handleFileSelect}
        />
        
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="icon" disabled={uploading}>
              <Smile className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <EmojiPicker onEmojiClick={handleEmojiClick} />
          </PopoverContent>
        </Popover>

        <Textarea
          value={message}
          onChange={handleTextChange}
          placeholder="Tapez votre message..."
          className="flex-1 min-h-[40px] max-h-[120px] resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        
        <Button type="submit" size="icon" disabled={(!message.trim() && !file) || uploading}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
};

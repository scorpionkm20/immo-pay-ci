import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Upload, Loader2, Sparkles, RefreshCw, Share2, MessageSquare, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSavedDesigns } from '@/hooks/useSavedDesigns';

const BEDROOM_STYLES = [
  { id: 'minimalist', name: 'Minimaliste', description: 'Épuré et fonctionnel' },
  { id: 'scandinavian', name: 'Scandinave', description: 'Chaleureux et lumineux' },
  { id: 'cozy', name: 'Cosy', description: 'Confortable et accueillant' },
  { id: 'modern', name: 'Moderne', description: 'Contemporain et élégant' },
  { id: 'bohemian', name: 'Bohème', description: 'Artistique et coloré' },
  { id: 'industrial', name: 'Industriel', description: 'Brut et authentique' },
  { id: 'luxury', name: 'Luxe', description: 'Raffiné et somptueux' },
  { id: 'vintage', name: 'Vintage', description: 'Rétro et nostalgique' },
  { id: 'gamer', name: 'Gaming', description: 'Setup gaming moderne' },
  { id: 'futuristic', name: 'Futuriste', description: 'Avant-gardiste et tech' },
];

const BedroomDesigner = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [designedImage, setDesignedImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sliderValue, setSliderValue] = useState([50]);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sharingLoading, setSharingLoading] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [designName, setDesignName] = useState('');
  const [savingLoading, setSavingLoading] = useState(false);
  
  const { saveDesign } = useSavedDesigns();

  // Load design from localStorage if available
  useEffect(() => {
    const loadedDesignStr = localStorage.getItem('loadedDesign');
    if (loadedDesignStr) {
      try {
        const loadedDesign = JSON.parse(loadedDesignStr);
        setOriginalImage(loadedDesign.original_image_url);
        setDesignedImage(loadedDesign.designed_image_url);
        setSelectedStyle(loadedDesign.style_name);
        toast({
          title: 'Design chargé',
          description: `"${loadedDesign.design_name}" a été chargé`,
        });
        // Clear from localStorage
        localStorage.removeItem('loadedDesign');
      } catch (error) {
        console.error('Error loading design:', error);
      }
    }
  }, [toast]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner une image valide',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setOriginalImage(event.target?.result as string);
      setDesignedImage(null);
      setSelectedStyle(null);
      setChatMessages([]);
    };
    reader.readAsDataURL(file);
  };

  const applyStyle = async (styleId: string) => {
    if (!originalImage) {
      toast({
        title: 'Erreur',
        description: 'Veuillez d\'abord télécharger une photo de chambre',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setSelectedStyle(styleId);

    const style = BEDROOM_STYLES.find(s => s.id === styleId);
    if (!style) return;

    try {
      console.log('Calling bedroom-designer function with style:', style.name);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Vous devez être connecté pour utiliser cette fonctionnalité');
      }

      const { data, error } = await supabase.functions.invoke('bedroom-designer', {
        body: {
          action: 'apply_style',
          originalImage,
          style: style.name,
          styleDescription: style.description,
        },
      });

      console.log('Response from bedroom-designer:', { data, error });

      if (error) {
        console.error('Function error:', error);
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.designedImage) {
        setDesignedImage(data.designedImage);
        toast({
          title: 'Succès!',
          description: `Style ${style.name} appliqué avec succès`,
        });
      } else {
        throw new Error('Aucune image générée');
      }
    } catch (error: any) {
      console.error('Error applying style:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'appliquer le style. Veuillez réessayer.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSurpriseMe = async () => {
    const randomStyle1 = BEDROOM_STYLES[Math.floor(Math.random() * BEDROOM_STYLES.length)];
    const randomStyle2 = BEDROOM_STYLES[Math.floor(Math.random() * BEDROOM_STYLES.length)];
    
    if (!originalImage) {
      toast({
        title: 'Erreur',
        description: 'Veuillez d\'abord télécharger une photo de chambre',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setSelectedStyle('surprise');

    try {
      console.log('Calling bedroom-designer for surprise');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Vous devez être connecté pour utiliser cette fonctionnalité');
      }

      const { data, error } = await supabase.functions.invoke('bedroom-designer', {
        body: {
          action: 'surprise',
          originalImage,
          style1: randomStyle1.name,
          style2: randomStyle2.name,
        },
      });

      console.log('Response from bedroom-designer:', { data, error });

      if (error) {
        console.error('Function error:', error);
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.designedImage) {
        setDesignedImage(data.designedImage);
        toast({
          title: 'Surprise! 🎉',
          description: `Mélange créatif: ${randomStyle1.name} + ${randomStyle2.name}`,
        });
      } else {
        throw new Error('Aucune image générée');
      }
    } catch (error: any) {
      console.error('Error with surprise:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de générer la surprise. Veuillez réessayer.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !designedImage) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatLoading(true);

    try {
      console.log('Calling bedroom-designer for refinement');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Vous devez être connecté pour utiliser cette fonctionnalité');
      }

      const { data, error } = await supabase.functions.invoke('bedroom-designer', {
        body: {
          action: 'refine',
          currentImage: designedImage,
          instruction: userMessage,
          conversationHistory: chatMessages,
        },
      });

      console.log('Response from bedroom-designer:', { data, error });

      if (error) {
        console.error('Function error:', error);
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.designedImage) {
        setDesignedImage(data.designedImage);
        setChatMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'J\'ai appliqué vos modifications. Que pensez-vous du résultat?' 
        }]);
      } else {
        throw new Error('Aucune image générée');
      }
    } catch (error: any) {
      console.error('Error refining design:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'appliquer les modifications. Veuillez réessayer.',
        variant: 'destructive',
      });
      setChatMessages(prev => prev.slice(0, -1)); // Remove user message on error
    } finally {
      setChatLoading(false);
    }
  };

  const shareWithManager = async () => {
    if (!designedImage) {
      toast({
        title: 'Erreur',
        description: 'Aucun design à partager',
        variant: 'destructive',
      });
      return;
    }

    setSharingLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      // Get the user's active lease to find their gestionnaire
      const { data: leases, error: leaseError } = await supabase
        .from('leases')
        .select('gestionnaire_id, property_id, space_id')
        .eq('locataire_id', user.id)
        .eq('statut', 'actif')
        .order('created_at', { ascending: false })
        .limit(1);

      if (leaseError) throw leaseError;
      if (!leases || leases.length === 0) {
        toast({
          title: 'Erreur',
          description: 'Aucun gestionnaire trouvé. Vous devez avoir un bail actif.',
          variant: 'destructive',
        });
        return;
      }

      const lease = leases[0];

      // Convert base64 to blob
      const base64Response = await fetch(designedImage);
      const blob = await base64Response.blob();
      
      // Upload to Supabase Storage
      const fileName = `bedroom-design-${Date.now()}.png`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('message-attachments')
        .upload(`${user.id}/${fileName}`, blob, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('message-attachments')
        .getPublicUrl(uploadData.path);

      // Check if conversation exists
      const { data: existingConv, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('property_id', lease.property_id)
        .eq('locataire_id', user.id)
        .eq('gestionnaire_id', lease.gestionnaire_id)
        .maybeSingle();

      if (convError) throw convError;

      let conversationId = existingConv?.id;

      // Create conversation if it doesn't exist
      if (!conversationId) {
        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert([{
            property_id: lease.property_id,
            locataire_id: user.id,
            gestionnaire_id: lease.gestionnaire_id,
            space_id: lease.space_id
          }])
          .select()
          .single();

        if (createError) throw createError;
        conversationId = newConv.id;
      }

      // Send message with design
      const { error: messageError } = await supabase
        .from('messages')
        .insert([{
          conversation_id: conversationId,
          sender_id: user.id,
          content: 'Voici mon nouveau design de chambre créé avec l\'assistant IA! Qu\'en pensez-vous?',
          file_url: publicUrl,
          file_type: 'image/png',
          file_name: fileName
        }]);

      if (messageError) throw messageError;

      toast({
        title: 'Succès!',
        description: 'Design partagé avec votre gestionnaire',
      });

      // Navigate to messages
      navigate('/messages');

    } catch (error: any) {
      console.error('Error sharing with manager:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de partager le design. Veuillez réessayer.',
        variant: 'destructive',
      });
    } finally {
      setSharingLoading(false);
    }
  };

  const shareViaWhatsApp = async () => {
    if (!designedImage) {
      toast({
        title: 'Erreur',
        description: 'Aucun design à partager',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Convert base64 to blob
      const base64Response = await fetch(designedImage);
      const blob = await base64Response.blob();
      
      // Create a file from blob
      const file = new File([blob], 'bedroom-design.png', { type: 'image/png' });
      
      // Check if Web Share API is available
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Mon Design de Chambre',
          text: 'Découvrez mon nouveau design de chambre créé avec l\'assistant IA!',
          files: [file]
        });
      } else {
        // Fallback: Open WhatsApp Web with text only
        const text = encodeURIComponent('Découvrez mon nouveau design de chambre créé avec l\'assistant IA! (Image jointe)');
        window.open(`https://wa.me/?text=${text}`, '_blank');
        
        toast({
          title: 'Info',
          description: 'Veuillez partager l\'image manuellement depuis votre appareil',
        });
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error sharing via WhatsApp:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de partager via WhatsApp',
          variant: 'destructive',
        });
      }
    }
  };

  const handleSaveDesign = () => {
    if (!originalImage || !designedImage) {
      toast({
        title: 'Erreur',
        description: 'Aucun design à sauvegarder',
        variant: 'destructive',
      });
      return;
    }
    
    // Set default name based on style
    const defaultName = `Design ${selectedStyle || 'personnalisé'} - ${new Date().toLocaleDateString('fr-FR')}`;
    setDesignName(defaultName);
    setSaveDialogOpen(true);
  };

  const handleConfirmSave = async () => {
    if (!designName.trim() || !originalImage || !designedImage) return;

    setSavingLoading(true);
    try {
      const style = BEDROOM_STYLES.find(s => s.id === selectedStyle);
      await saveDesign(
        designName.trim(),
        style?.name || selectedStyle || 'personnalisé',
        style?.description || null,
        originalImage,
        designedImage
      );
      
      setSaveDialogOpen(false);
      setDesignName('');
    } catch (error) {
      // Error already handled in useSavedDesigns
    } finally {
      setSavingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate('/profile')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au profil
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Assistant Design de Chambre</h1>
            <p className="text-muted-foreground">Transformez votre chambre avec l'intelligence artificielle</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload and Visualization Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Votre Chambre</CardTitle>
                <CardDescription>Téléchargez une photo de votre chambre pour commencer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-8 hover:border-primary transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground text-center">
                    Cliquez pour télécharger une photo de votre chambre
                  </p>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {originalImage && designedImage && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Comparaison Avant / Après</Label>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleSaveDesign}>
                          <Save className="h-4 w-4 mr-2" />
                          Sauvegarder
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" disabled={sharingLoading}>
                              {sharingLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Share2 className="h-4 w-4 mr-2" />
                                  Partager
                                </>
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={shareWithManager}>
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Partager avec mon gestionnaire
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={shareViaWhatsApp}>
                              <svg 
                                className="h-4 w-4 mr-2" 
                                viewBox="0 0 24 24" 
                                fill="currentColor"
                              >
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                              </svg>
                              Partager via WhatsApp
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="relative w-full aspect-video overflow-hidden rounded-lg bg-muted">
                      <div className="absolute inset-0">
                        <img 
                          src={designedImage} 
                          alt="Design appliqué" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div 
                        className="absolute inset-0 overflow-hidden"
                        style={{ clipPath: `inset(0 ${100 - sliderValue[0]}% 0 0)` }}
                      >
                        <img 
                          src={originalImage} 
                          alt="Photo originale" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div 
                        className="absolute top-0 bottom-0 w-1 bg-primary z-10"
                        style={{ left: `${sliderValue[0]}%` }}
                      >
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                          <RefreshCw className="h-4 w-4 text-primary-foreground" />
                        </div>
                      </div>
                    </div>
                    <Slider
                      value={sliderValue}
                      onValueChange={setSliderValue}
                      min={0}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Avant</span>
                      <span>Après</span>
                    </div>
                  </div>
                )}

                {originalImage && !designedImage && (
                  <div className="w-full aspect-video overflow-hidden rounded-lg">
                    <img 
                      src={originalImage} 
                      alt="Photo originale" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Styles and Chat Section */}
          <div className="space-y-6">
            <Tabs defaultValue="styles" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="styles">Styles</TabsTrigger>
                <TabsTrigger value="chat" disabled={!designedImage}>Chat IA</TabsTrigger>
              </TabsList>

              <TabsContent value="styles" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Choisissez un Style</CardTitle>
                    <CardDescription>Sélectionnez parmi 10 styles de décoration</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Carousel className="w-full">
                      <CarouselContent>
                        {BEDROOM_STYLES.map((style) => (
                          <CarouselItem key={style.id} className="md:basis-1/2">
                            <Card 
                              className={cn(
                                "cursor-pointer transition-all hover:shadow-lg",
                                selectedStyle === style.id && "ring-2 ring-primary"
                              )}
                              onClick={() => applyStyle(style.id)}
                            >
                              <CardHeader>
                                <CardTitle className="text-lg">{style.name}</CardTitle>
                                <CardDescription>{style.description}</CardDescription>
                              </CardHeader>
                            </Card>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      <CarouselPrevious />
                      <CarouselNext />
                    </Carousel>

                    <div className="mt-6">
                      <Button 
                        onClick={handleSurpriseMe} 
                        className="w-full"
                        variant="secondary"
                        disabled={loading || !originalImage}
                      >
                        {loading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="mr-2 h-4 w-4" />
                        )}
                        Surprends-moi!
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="chat" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Affinez Votre Design</CardTitle>
                    <CardDescription>Discutez avec l'IA pour personnaliser votre chambre</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-4">
                        {chatMessages.map((message, index) => (
                          <div 
                            key={index}
                            className={cn(
                              "flex",
                              message.role === 'user' ? 'justify-end' : 'justify-start'
                            )}
                          >
                            <div 
                              className={cn(
                                "max-w-[80%] rounded-lg px-4 py-2",
                                message.role === 'user' 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'bg-muted'
                              )}
                            >
                              <p className="text-sm">{message.content}</p>
                            </div>
                          </div>
                        ))}
                        {chatLoading && (
                          <div className="flex justify-start">
                            <div className="bg-muted rounded-lg px-4 py-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>

                    <form onSubmit={handleChatSubmit} className="flex gap-2">
                      <Textarea
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Ex: Rends les murs rose pastel..."
                        className="flex-1 min-h-[60px]"
                        disabled={chatLoading}
                      />
                      <Button type="submit" disabled={chatLoading || !chatInput.trim()}>
                        Envoyer
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Save Design Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sauvegarder le design</DialogTitle>
            <DialogDescription>
              Donnez un nom à votre design pour le retrouver facilement
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="design-name">Nom du design</Label>
              <Input
                id="design-name"
                value={designName}
                onChange={(e) => setDesignName(e.target.value)}
                placeholder="Mon design minimaliste"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleConfirmSave} disabled={savingLoading || !designName.trim()}>
              {savingLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                'Sauvegarder'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BedroomDesigner;

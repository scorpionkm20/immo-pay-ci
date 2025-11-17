import { useState, useRef } from 'react';
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
import { ArrowLeft, Upload, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      const { data, error } = await supabase.functions.invoke('bedroom-designer', {
        body: {
          action: 'apply_style',
          originalImage,
          style: style.name,
          styleDescription: style.description,
        },
      });

      if (error) throw error;

      if (data?.designedImage) {
        setDesignedImage(data.designedImage);
        toast({
          title: 'Succès!',
          description: `Style ${style.name} appliqué avec succès`,
        });
      }
    } catch (error: any) {
      console.error('Error applying style:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'appliquer le style. Veuillez réessayer.',
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
      const { data, error } = await supabase.functions.invoke('bedroom-designer', {
        body: {
          action: 'surprise',
          originalImage,
          style1: randomStyle1.name,
          style2: randomStyle2.name,
        },
      });

      if (error) throw error;

      if (data?.designedImage) {
        setDesignedImage(data.designedImage);
        toast({
          title: 'Surprise! 🎉',
          description: `Mélange créatif: ${randomStyle1.name} + ${randomStyle2.name}`,
        });
      }
    } catch (error: any) {
      console.error('Error with surprise:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de générer la surprise. Veuillez réessayer.',
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
      const { data, error } = await supabase.functions.invoke('bedroom-designer', {
        body: {
          action: 'refine',
          currentImage: designedImage,
          instruction: userMessage,
          conversationHistory: chatMessages,
        },
      });

      if (error) throw error;

      if (data?.designedImage) {
        setDesignedImage(data.designedImage);
        setChatMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'J\'ai appliqué vos modifications. Que pensez-vous du résultat?' 
        }]);
      }
    } catch (error: any) {
      console.error('Error refining design:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible d\'appliquer les modifications. Veuillez réessayer.',
        variant: 'destructive',
      });
      setChatMessages(prev => prev.slice(0, -1)); // Remove user message on error
    } finally {
      setChatLoading(false);
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
                    <Label>Comparaison Avant / Après</Label>
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
    </div>
  );
};

export default BedroomDesigner;

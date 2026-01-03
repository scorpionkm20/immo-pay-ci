import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { RequestPropertyDialog } from "@/components/RequestPropertyDialog";
import { PaymentSection } from "@/components/PaymentSection";
import {
  ArrowLeft,
  MapPin,
  Home,
  Maximize2,
  MessageSquare,
  Euro,
  BedDouble,
  X,
  ChevronLeft,
  ChevronRight,
  FileCheck,
  CreditCard,
  CheckCircle,
} from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const PropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [property, setProperty] = useState<any>(null);
  const [gestionnaire, setGestionnaire] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<{
    leaseId: string;
    montant: number;
    moisPaiement: string;
    isCaution: boolean;
  } | null>(null);
  const [showPaymentSection, setShowPaymentSection] = useState(false);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    fetchPropertyDetails();
    if (user && userRole === 'locataire') {
      checkPendingPayment();
    }
  }, [id, user, userRole]);

  useEffect(() => {
    if (property?.latitude && property?.longitude && mapContainer.current && !map.current) {
      initializeMap();
    }
  }, [property]);

  const checkPendingPayment = async () => {
    if (!user || !id) return;

    // Vérifier si l'utilisateur a un bail actif pour cette propriété avec un paiement en attente
    const { data: leases } = await supabase
      .from('leases')
      .select('id, caution_montant, caution_payee, montant_mensuel')
      .eq('property_id', id)
      .eq('locataire_id', user.id)
      .eq('statut', 'actif');

    if (leases && leases.length > 0) {
      const lease = leases[0];
      
      // Récupérer le paiement en attente
      const { data: payments } = await supabase
        .from('payments')
        .select('id, montant, mois_paiement')
        .eq('lease_id', lease.id)
        .eq('statut', 'en_attente')
        .order('created_at', { ascending: true })
        .limit(1);

      if (payments && payments.length > 0) {
        const payment = payments[0];
        setPendingPayment({
          leaseId: lease.id,
          montant: payment.montant,
          moisPaiement: payment.mois_paiement,
          isCaution: payment.montant === lease.caution_montant && !lease.caution_payee
        });
      }
    }
  };

  const initializeMap = async () => {
    if (!property?.latitude || !property?.longitude || !mapContainer.current) return;

    try {
      const { data: secrets } = await supabase.functions.invoke(
        "sk.eyJ1IjoiZGplZG91NzUiLCJhIjoiY21odzZibmo4MDJ4dTJrc2Nyd3M1bDdjdiJ9.o4E5WXDHhjZzKHAPguDVCQ",
      );
      const token = secrets?.token || import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;

      mapboxgl.accessToken = token;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [property.longitude, property.latitude],
        zoom: 14,
      });

      // Add marker
      new mapboxgl.Marker({ color: "#2B8A3E" })
        .setLngLat([property.longitude, property.latitude])
        .setPopup(new mapboxgl.Popup().setHTML(`<h3 class="font-semibold">${property.titre}</h3>`))
        .addTo(map.current);

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    } catch (error) {
      console.error("Error initializing map:", error);
    }
  };

  const fetchPropertyDetails = async () => {
    try {
      const { data: propertyData, error: propertyError } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .single();

      if (propertyError) throw propertyError;
      setProperty(propertyData);

      // Fetch gestionnaire profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", propertyData.gestionnaire_id)
        .single();

      setGestionnaire(profileData);
    } catch (error: any) {
      console.error("Error fetching property:", error);
      toast.error("Erreur lors du chargement des détails");
    } finally {
      setLoading(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Vous devez être connecté pour contacter le gestionnaire");
      navigate("/auth");
      return;
    }

    if (!message.trim()) {
      toast.error("Veuillez saisir un message");
      return;
    }

    setSending(true);
    try {
      // Check if conversation exists
      const { data: existingConversation } = await supabase
        .from("conversations")
        .select("id")
        .eq("property_id", id)
        .eq("locataire_id", user.id)
        .eq("gestionnaire_id", property.gestionnaire_id)
        .maybeSingle();

      let conversationId = existingConversation?.id;

      // Create conversation if doesn't exist
      if (!conversationId) {
        // Get space_id from the property
        const { data: propertyData } = await supabase.from("properties").select("space_id").eq("id", id).single();

        const { data: newConversation, error: convError } = await supabase
          .from("conversations")
          .insert({
            property_id: id,
            locataire_id: user.id,
            gestionnaire_id: property.gestionnaire_id,
            space_id: propertyData?.space_id,
          })
          .select()
          .single();

        if (convError) throw convError;
        conversationId = newConversation.id;
      }

      // Send message
      const { error: messageError } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: message,
      });

      if (messageError) throw messageError;

      toast.success("Message envoyé avec succès");
      setMessage("");
      navigate("/messages");
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error("Erreur lors de l'envoi du message");
    } finally {
      setSending(false);
    }
  };

  const nextImage = () => {
    if (selectedImage !== null && property.images) {
      setSelectedImage((selectedImage + 1) % property.images.length);
    }
  };

  const prevImage = () => {
    if (selectedImage !== null && property.images) {
      setSelectedImage(selectedImage === 0 ? property.images.length - 1 : selectedImage - 1);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-lg text-muted-foreground mb-4">Propriété introuvable</p>
          <Button onClick={() => navigate("/properties")}>Retour aux annonces</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Fullscreen Image Viewer */}
      {selectedImage !== null && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white hover:text-primary transition-colors"
          >
            <X className="h-8 w-8" />
          </button>

          <button onClick={prevImage} className="absolute left-4 text-white hover:text-primary transition-colors">
            <ChevronLeft className="h-12 w-12" />
          </button>

          <img
            src={property.images[selectedImage]}
            alt={`${property.titre} - Image ${selectedImage + 1}`}
            className="max-h-[90vh] max-w-[90vw] object-contain"
          />

          <button onClick={nextImage} className="absolute right-4 text-white hover:text-primary transition-colors">
            <ChevronRight className="h-12 w-12" />
          </button>

          <div className="absolute bottom-4 text-white text-sm">
            {selectedImage + 1} / {property.images.length}
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Smart Back Button */}
        <Button
          variant="ghost"
          onClick={() => {
            if (user) {
              // For authenticated users, go back in history or to dashboard
              if (window.history.length > 2) {
                navigate(-1);
              } else {
                navigate("/dashboard");
              }
            } else {
              // For unauthenticated users, go to home/landing page
              navigate("/");
            }
          }}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {user ? "Retour" : "Accueil"}
        </Button>

        {/* Image Gallery */}
        <div className="grid grid-cols-4 gap-2 mb-8">
          {property.images && property.images.length > 0 ? (
            <>
              <div
                className="col-span-4 md:col-span-3 row-span-2 relative cursor-pointer group overflow-hidden rounded-lg"
                onClick={() => setSelectedImage(0)}
              >
                <img
                  src={property.images[0]}
                  alt={property.titre}
                  className="w-full h-[400px] object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <Maximize2 className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              {property.images.slice(1, 5).map((image: string, index: number) => (
                <div
                  key={index}
                  className="relative cursor-pointer group overflow-hidden rounded-lg"
                  onClick={() => setSelectedImage(index + 1)}
                >
                  <img
                    src={image}
                    alt={`${property.titre} - ${index + 2}`}
                    className="w-full h-[196px] object-cover transition-transform group-hover:scale-105"
                  />
                  {index === 3 && property.images.length > 5 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-semibold text-xl">
                      +{property.images.length - 5}
                    </div>
                  )}
                </div>
              ))}
            </>
          ) : (
            <div className="col-span-4 h-[400px] bg-muted rounded-lg flex items-center justify-center">
              <Home className="h-16 w-16 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title and Price */}
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{property.titre}</h1>
                  <div className="flex items-center text-muted-foreground mb-2">
                    <MapPin className="h-4 w-4 mr-1" />
                    {property.adresse}, {property.quartier}, {property.ville}
                  </div>
                </div>
                <Badge
                  variant={property.statut === "disponible" ? "default" : "secondary"}
                  className="text-lg px-4 py-2"
                >
                  {property.statut === "disponible" ? "Disponible" : "Loué"}
                </Badge>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-primary">{property.prix_mensuel.toLocaleString()} FCFA</span>
                <span className="text-muted-foreground">/mois</span>
              </div>
            </div>

            <Separator />

            {/* Property Details */}
            <Card>
              <CardHeader>
                <CardTitle>Caractéristiques</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <BedDouble className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Pièces</p>
                      <p className="font-semibold">{property.nombre_pieces}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Maximize2 className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Surface</p>
                      <p className="font-semibold">{property.surface_m2 || "N/A"} m²</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Home className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Type</p>
                      <p className="font-semibold">{property.type_propriete}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Euro className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Caution</p>
                      <p className="font-semibold">{property.caution.toLocaleString()} FCFA</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-line">{property.description}</p>
              </CardContent>
            </Card>

            {/* Équipements */}
            {property.equipements && property.equipements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Équipements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {property.equipements.map((equipement: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        {equipement}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Map */}
            {property.latitude && property.longitude && (
              <Card>
                <CardHeader>
                  <CardTitle>Localisation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div ref={mapContainer} className="w-full h-[400px] rounded-lg" />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Contact Form */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Contacter le gestionnaire
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {gestionnaire && (
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-lg">
                      {gestionnaire.full_name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold">{gestionnaire.full_name}</p>
                      <p className="text-sm text-muted-foreground">Gestionnaire</p>
                    </div>
                  </div>
                )}

                {/* Section de paiement direct pour locataire avec bail actif */}
                {user && userRole === 'locataire' && pendingPayment && (
                  <Card className="border-primary bg-primary/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-primary" />
                        Paiement en attente
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          {pendingPayment.isCaution ? 'Caution' : 'Loyer'}
                        </span>
                        <span className="text-xl font-bold text-primary">
                          {pendingPayment.montant.toLocaleString()} FCFA
                        </span>
                      </div>
                      
                      {showPaymentSection ? (
                        <PaymentSection
                          leaseId={pendingPayment.leaseId}
                          montant={pendingPayment.montant}
                          moisPaiement={pendingPayment.moisPaiement}
                          isCaution={pendingPayment.isCaution}
                          propertyTitle={property?.titre}
                          onSuccess={() => {
                            setPendingPayment(null);
                            setShowPaymentSection(false);
                            toast.success("Paiement effectué avec succès !");
                          }}
                          onClose={() => setShowPaymentSection(false)}
                        />
                      ) : (
                        <Button 
                          onClick={() => setShowPaymentSection(true)}
                          className="w-full"
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Payer maintenant
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Demande de location formelle */}
                {user && userRole === 'locataire' && property?.statut === 'disponible' && !pendingPayment && (
                  <div className="space-y-2">
                    <Button
                      onClick={() => setRequestDialogOpen(true)}
                      className="w-full"
                      variant="default"
                    >
                      <FileCheck className="h-4 w-4 mr-2" />
                      Faire une demande de location
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      Envoyez une demande formelle au gestionnaire
                    </p>
                    <Separator />
                  </div>
                )}

                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Votre message</label>
                    <Textarea
                      placeholder="Bonjour, je suis intéressé par cette propriété..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={6}
                      className="resize-none"
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={sending || !message.trim()}>
                    {sending ? "Envoi..." : "Envoyer le message"}
                  </Button>

                  {!user && (
                    <p className="text-xs text-center text-muted-foreground">
                      Vous devez être connecté pour envoyer un message
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Request Dialog */}
      {property && (
        <RequestPropertyDialog
          open={requestDialogOpen}
          onOpenChange={setRequestDialogOpen}
          propertyId={property.id}
          propertyTitle={property.titre}
          managerId={property.gestionnaire_id}
          spaceId={property.space_id}
          monthlyRent={property.prix_mensuel}
          cautionAmount={property.caution}
          onSuccess={() => {
            toast.success("Demande envoyée avec succès");
          }}
        />
      )}
    </div>
  );
};

export default PropertyDetail;

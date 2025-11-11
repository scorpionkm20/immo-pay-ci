import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Navbar } from '@/components/Navbar';
import { useProperties } from '@/hooks/useProperties';
import PropertyCard from '@/components/PropertyCard';
import { Building2, Shield, CreditCard, FileText, Search, Home } from 'lucide-react';
import heroImage from '@/assets/hero-image.jpg';
import featureUsers from '@/assets/feature-users.jpg';
import featurePayments from '@/assets/feature-payments.jpg';
import featureManagement from '@/assets/feature-management.jpg';

const Landing = () => {
  const navigate = useNavigate();
  const { properties } = useProperties();
  const featuredProperties = properties?.slice(0, 3) || [];

  const features = [
    {
      icon: Building2,
      title: 'Gestion Simplifiée',
      description: 'Gérez toutes vos propriétés depuis un seul tableau de bord intuitif.',
      image: featureManagement,
    },
    {
      icon: CreditCard,
      title: 'Paiements Sécurisés',
      description: 'Payez votre loyer en toute sécurité avec Orange Money, MTN Mobile Money, et Moov Money.',
      image: featurePayments,
    },
    {
      icon: FileText,
      title: 'Documents Numériques',
      description: 'Signez et gérez tous vos contrats et documents en ligne.',
      image: featureUsers,
    },
  ];

  const stats = [
    { value: '1000+', label: 'Propriétés' },
    { value: '500+', label: 'Gestionnaires' },
    { value: '2000+', label: 'Locataires Satisfaits' },
    { value: '100%', label: 'Sécurisé' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-90" />
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})`, mixBlendMode: 'multiply', opacity: 0.3 }}
        />
        <div className="container relative z-10 py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center text-white">
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Louez et Gérez vos Propriétés en{' '}
              <span className="text-secondary">Côte d'Ivoire</span>
            </h1>
            <p className="mb-8 text-lg text-gray-100 md:text-xl">
              La plateforme complète pour locataires et gestionnaires. Trouvez votre logement idéal
              ou gérez vos propriétés en toute simplicité.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                onClick={() => navigate('/properties')}
                className="bg-secondary hover:bg-secondary-hover text-secondary-foreground"
              >
                <Search className="mr-2 h-5 w-5" />
                Voir les Annonces
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/auth')}
                className="border-white text-white hover:bg-white/10"
              >
                <Home className="mr-2 h-5 w-5" />
                Publier une Annonce
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y bg-primary-light py-12">
        <div className="container">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="mb-2 text-4xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
              Pourquoi Choisir LoyerFacile ?
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              Une solution complète pour faciliter la location et la gestion immobilière en Côte d'Ivoire.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {features.map((feature, index) => (
              <Card key={index} className="overflow-hidden transition-shadow hover:shadow-lg">
                <div className="aspect-video overflow-hidden">
                  <img
                    src={feature.image}
                    alt={feature.title}
                    className="h-full w-full object-cover transition-transform hover:scale-105"
                  />
                </div>
                <CardHeader>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      {featuredProperties.length > 0 && (
        <section className="bg-muted py-20">
          <div className="container">
            <div className="mb-12 text-center">
              <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
                Propriétés à la Une
              </h2>
              <p className="mx-auto max-w-2xl text-muted-foreground">
                Découvrez nos meilleures offres de location disponibles immédiatement.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featuredProperties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>

            <div className="mt-12 text-center">
              <Button size="lg" onClick={() => navigate('/properties')}>
                Voir Toutes les Annonces
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="relative overflow-hidden bg-gradient-primary py-20 text-white">
        <div className="container relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <Shield className="mx-auto mb-6 h-16 w-16" />
            <h2 className="mb-4 text-3xl font-bold md:text-4xl">
              Prêt à Commencer ?
            </h2>
            <p className="mb-8 text-lg text-gray-100">
              Rejoignez des milliers d'utilisateurs qui font confiance à LoyerFacile pour
              leurs transactions immobilières en Côte d'Ivoire.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                onClick={() => navigate('/auth')}
                className="bg-secondary hover:bg-secondary-hover text-secondary-foreground"
              >
                Créer un Compte Gratuit
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/properties')}
                className="border-white text-white hover:bg-white/10"
              >
                Explorer les Annonces
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="mb-4 flex items-center space-x-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-primary">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg font-bold">LoyerFacile</span>
              </div>
              <p className="text-sm text-muted-foreground">
                La solution moderne pour la location immobilière en Côte d'Ivoire.
              </p>
            </div>
            
            <div>
              <h3 className="mb-4 font-semibold">Liens Rapides</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <button onClick={() => navigate('/properties')} className="hover:text-primary">
                    Annonces
                  </button>
                </li>
                <li>
                  <button onClick={() => navigate('/auth')} className="hover:text-primary">
                    Connexion
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="mb-4 font-semibold">Support</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Contact</li>
                <li>FAQ</li>
              </ul>
            </div>

            <div>
              <h3 className="mb-4 font-semibold">Légal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Confidentialité</li>
                <li>Conditions d'utilisation</li>
              </ul>
            </div>
          </div>

          <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} LoyerFacile. Tous droits réservés.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;

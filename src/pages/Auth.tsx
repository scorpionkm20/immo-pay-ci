import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { z } from 'zod';

const signUpSchema = z.object({
  email: z.string().trim().email({ message: "Email invalide" }),
  password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères" }),
  fullName: z.string().trim().min(2, { message: "Le nom doit contenir au moins 2 caractères" }).max(100),
  phone: z.string().trim().min(8, { message: "Numéro de téléphone invalide" }).max(20),
  role: z.enum(['locataire', 'gestionnaire', 'proprietaire'])
});

const signInSchema = z.object({
  email: z.string().trim().email({ message: "Email invalide" }),
  password: z.string().min(1, { message: "Mot de passe requis" })
});

const Auth = () => {
  const navigate = useNavigate();
  const { signUp, signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  
  // Sign Up Form State
  const [signUpForm, setSignUpForm] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    role: 'locataire'
  });
  const [signUpErrors, setSignUpErrors] = useState<any>({});

  // Sign In Form State
  const [signInForm, setSignInForm] = useState({
    email: '',
    password: ''
  });
  const [signInErrors, setSignInErrors] = useState<any>({});

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignUpErrors({});
    
    const result = signUpSchema.safeParse(signUpForm);
    if (!result.success) {
      const errors: any = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) errors[err.path[0]] = err.message;
      });
      setSignUpErrors(errors);
      return;
    }

    setLoading(true);
    const { error } = await signUp(
      signUpForm.email,
      signUpForm.password,
      signUpForm.fullName,
      signUpForm.phone,
      signUpForm.role
    );
    setLoading(false);

    if (!error) {
      navigate('/');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInErrors({});
    
    const result = signInSchema.safeParse(signInForm);
    if (!result.success) {
      const errors: any = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) errors[err.path[0]] = err.message;
      });
      setSignInErrors(errors);
      return;
    }

    setLoading(true);
    const { error } = await signIn(signInForm.email, signInForm.password);
    setLoading(false);

    if (!error) {
      navigate('/');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Bienvenue</CardTitle>
          <CardDescription className="text-center">
            Gérez vos biens immobiliers facilement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Connexion</TabsTrigger>
              <TabsTrigger value="signup">Inscription</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="votre@email.com"
                    value={signInForm.email}
                    onChange={(e) => setSignInForm({ ...signInForm, email: e.target.value })}
                    required
                  />
                  {signInErrors.email && (
                    <p className="text-sm text-destructive">{signInErrors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signin-password">Mot de passe</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={signInForm.password}
                    onChange={(e) => setSignInForm({ ...signInForm, password: e.target.value })}
                    required
                  />
                  {signInErrors.password && (
                    <p className="text-sm text-destructive">{signInErrors.password}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Connexion...' : 'Se connecter'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-fullname">Nom complet</Label>
                  <Input
                    id="signup-fullname"
                    type="text"
                    placeholder="Jean Dupont"
                    value={signUpForm.fullName}
                    onChange={(e) => setSignUpForm({ ...signUpForm, fullName: e.target.value })}
                    required
                  />
                  {signUpErrors.fullName && (
                    <p className="text-sm text-destructive">{signUpErrors.fullName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Téléphone</Label>
                  <Input
                    id="signup-phone"
                    type="tel"
                    placeholder="+225 0102030405"
                    value={signUpForm.phone}
                    onChange={(e) => setSignUpForm({ ...signUpForm, phone: e.target.value })}
                    required
                  />
                  {signUpErrors.phone && (
                    <p className="text-sm text-destructive">{signUpErrors.phone}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-role">Type de compte</Label>
                  <Select
                    value={signUpForm.role}
                    onValueChange={(value) => setSignUpForm({ ...signUpForm, role: value })}
                  >
                    <SelectTrigger id="signup-role">
                      <SelectValue placeholder="Sélectionnez un type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="locataire">Locataire</SelectItem>
                      <SelectItem value="gestionnaire">Gestionnaire</SelectItem>
                      <SelectItem value="proprietaire">Propriétaire</SelectItem>
                    </SelectContent>
                  </Select>
                  {signUpErrors.role && (
                    <p className="text-sm text-destructive">{signUpErrors.role}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="votre@email.com"
                    value={signUpForm.email}
                    onChange={(e) => setSignUpForm({ ...signUpForm, email: e.target.value })}
                    required
                  />
                  {signUpErrors.email && (
                    <p className="text-sm text-destructive">{signUpErrors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Mot de passe</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signUpForm.password}
                    onChange={(e) => setSignUpForm({ ...signUpForm, password: e.target.value })}
                    required
                  />
                  {signUpErrors.password && (
                    <p className="text-sm text-destructive">{signUpErrors.password}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Inscription..." : "S'inscrire"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;

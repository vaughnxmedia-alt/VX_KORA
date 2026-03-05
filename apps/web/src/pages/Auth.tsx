import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

import { Logo } from "@/components/Logo";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("signin");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Check if we just completed signup
    const signupComplete = sessionStorage.getItem('signupComplete');
    if (signupComplete === 'true') {
      // Clear the flag immediately to avoid showing on reload
      sessionStorage.removeItem('signupComplete');
    }
    
    // Handle redirect from Brand Blueprint
    if (location.state?.message) {
      toast({
        title: "Sign up required",
        description: location.state.message,
      });
      // Default to signup tab when coming from Brand Blueprint
      setActiveTab("signup");
    }
  }, [location.state, toast]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        toast({
          title: "Success!",
          description: "You have been signed in successfully.",
        });
        
        // Check if user should be redirected back to Brand Blueprint
        const redirectTo = location.state?.redirectTo;
        if (redirectTo) {
          navigate(redirectTo);
        } else {
          // After sign-in, always navigate to the main dashboard.
          // The ProtectedRoute component will handle role-specific logic.
          navigate('/dashboard');
        }
      }
    } catch (error: any) {
      toast({
        title: "Sign In Failed",
        description: error.message || "An error occurred during sign in",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !firstName || !lastName || !phone) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: phone,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        // Store a flag to show the confirmation message
        sessionStorage.setItem('signupComplete', 'true');
        
        // If coming from Brand Blueprint, update the message
        const fromBrandBlueprint = location.state?.redirectTo === "/brand-blueprint";
        
        setActiveTab("signin");
        toast({
          title: "Account Created!",
          description: fromBrandBlueprint 
            ? "Please check your email to confirm your account, then sign in to complete your Brand Blueprint submission."
            : "Please check your email to confirm your account, then complete your Brand Blueprint to get started.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Sign Up Failed",
        description: error.message || "An error occurred during sign up",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast({
        title: "Reset Link Sent!",
        description: "Check your email for a password reset link.",
      });
      setShowForgotPassword(false);
      setResetEmail("");
    } catch (error: any) {
      toast({
        title: "Reset Failed",
        description: error.message || "An error occurred sending reset email",
        variant: "destructive",
      });
    } finally {
      setResetLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 flex flex-col items-center">
            <Logo className="mb-4 scale-150" />
            <p className="text-muted-foreground mt-2">Reset your password</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Forgot Password</CardTitle>
              <CardDescription>
                Enter your email address and we'll send you a link to reset your password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="Enter your email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={resetLoading}>
                  {resetLoading ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : "Send Reset Link"}
                </Button>
              </form>
              
              <div className="mt-6 text-center">
                <Button 
                  variant="link" 
                  onClick={() => setShowForgotPassword(false)}
                  className="text-sm text-muted-foreground"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Sign In
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 flex flex-col items-center">
          <Logo className="mb-4 scale-150" />
          <p className="text-muted-foreground mt-2">Welcome back! Please sign in to your account.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-background data-[state=active]:text-foreground">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin" className="space-y-4 bg-primary p-6 rounded-lg">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-primary-foreground">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-background text-foreground border-background"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-primary-foreground">Password</Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="bg-background text-foreground border-background"
                        autoComplete="current-password"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full bg-background text-foreground hover:bg-background/90" disabled={loading}>
                    {loading ? (
                      <>
                        <Spinner className="mr-2 h-4 w-4 animate-spin" />
                        Signing In...
                      </>
                    ) : "Sign In"}
                  </Button>
                  
                  <div className="text-center">
                    <Button 
                      type="button"
                      variant="link" 
                      onClick={() => setShowForgotPassword(true)}
                      className="text-primary-foreground/80 hover:text-primary-foreground text-sm"
                    >
                      Forgot your password?
                    </Button>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4 bg-background p-6 rounded-lg border border-border">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-firstname">First Name</Label>
                      <Input
                        id="signup-firstname"
                        type="text"
                        placeholder="Enter your first name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-lastname">Last Name</Label>
                      <Input
                        id="signup-lastname"
                        type="text"
                        placeholder="Enter your last name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Phone Number</Label>
                    <Input
                      id="signup-phone"
                      type="tel"
                      placeholder="Enter your phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password (min. 6 characters)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        required
                        minLength={6}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading}>
                    {loading ? (
                      <>
                        <Spinner className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            
            <div className="mt-6 text-center">
              <Button 
                variant="link" 
                onClick={() => navigate('/')}
                className="text-sm text-muted-foreground"
              >
                ← Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
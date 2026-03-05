import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireBlueprint?: boolean;
  allowedRoles?: ('admin' | 'author' | 'client')[];
}

const ProtectedRoute = ({ children, requireBlueprint = true, allowedRoles }: ProtectedRouteProps) => {
  const { user, profile, isLoading: authLoading, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    data: hasBlueprint,
    isLoading: isCheckingBlueprint,
    isError,
    error,
  } = useQuery({
    queryKey: ['hasBlueprint', user?.id],
    enabled: Boolean(user && requireBlueprint && !authLoading),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000, // keep in cache for 10 minutes
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async () => {
      if (!user) return false;
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (customerError && customerError.code !== 'PGRST116') {
        throw customerError;
      }

      if (!customerData) {
        return false;
      }

      const { data: blueprintData, error: blueprintError } = await supabase
        .from('brand_blueprints')
        .select('payment_status')
        .eq('customer_id', customerData.id)
        .eq('payment_status', 'paid')
        .maybeSingle();

      if (blueprintError && blueprintError.code !== 'PGRST116') {
        throw blueprintError;
      }

      return Boolean(blueprintData);
    },
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!authLoading && user && allowedRoles && role) {
      if (!allowedRoles.includes(role)) {
        toast({
          title: "Unauthorized",
          description: "You don't have permission to access this page.",
          variant: "destructive",
        });
        navigate('/dashboard'); // or a dedicated unauthorized page
      }
    }
  }, [authLoading, user, role, allowedRoles, navigate, toast]);

  useEffect(() => {
    if (isError && error) {
      console.error('Error checking blueprint status:', error);
      toast({
        title: 'Error',
        description: 'Failed to check your account status. Please try again.',
        variant: 'destructive',
      });
    }
  }, [isError, error, toast]);

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    return null;
  }

  // If roles are specified, check them
  if (allowedRoles && !authLoading && role && !allowedRoles.includes(role)) {
    // This will be caught by the useEffect above, which shows a toast and navigates away.
    // Returning a loader here prevents a flash of the unauthorized content.
    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Checking permissions...</p>
            </div>
        </div>
    );
  }

  // Show loading while checking blueprint status
  if (requireBlueprint && isCheckingBlueprint) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Checking your account status...</p>
        </div>
      </div>
    );
  }

  // If blueprint is required but user doesn't have one, show the gate
  // This check should only apply to users with the 'client' role.
  if (requireBlueprint && role === 'client' && hasBlueprint === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-accent" />
            </div>
            <CardTitle className="text-2xl">Brand Blueprint Required</CardTitle>
            <CardDescription>
              To access the full platform, you need to complete your Brand Blueprint purchase.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-accent/5 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">What you'll get:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Comprehensive brand analysis</li>
                <li>• Strategic recommendations</li>
                <li>• Personalized brand roadmap</li>
                <li>• Full platform access</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <Button 
                onClick={() => navigate('/brand-blueprint')} 
                className="flex-1"
                variant="hero"
              >
                Get Your Blueprint
              </Button>
              <Button 
                onClick={() => navigate('/')} 
                variant="outline"
              >
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User has blueprint or it's not required, render children
  return <>{children}</>;
};

export default ProtectedRoute;

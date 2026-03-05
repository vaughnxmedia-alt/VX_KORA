import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const EmailConfirmation = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Get the token and type from URL parameters
        const token = searchParams.get('token');
        const type = searchParams.get('type');

        if (!token || type !== 'signup') {
          setStatus('error');
          setMessage('Invalid confirmation link. Please try signing up again.');
          return;
        }

        // Verify the token with Supabase
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'signup'
        });

        if (error) {
          setStatus('error');
          setMessage('Failed to confirm email. The link may have expired or is invalid.');
          toast({
            title: "Confirmation Failed",
            description: error.message,
            variant: "destructive",
          });
        } else if (data.user) {
          setStatus('success');
          setMessage('Your email has been successfully confirmed! You can now sign in to your account.');
          toast({
            title: "Email Confirmed!",
            description: "Your account is now active.",
          });
        }
      } catch (err) {
        setStatus('error');
        setMessage('An unexpected error occurred. Please try again.');
      }
    };

    handleEmailConfirmation();
  }, [searchParams, toast]);

  const handleSignInRedirect = () => {
    navigate('/dashboard');
  };

  const handleResendConfirmation = () => {
    navigate('/auth');
    toast({
      title: "Resend Confirmation",
      description: "Please sign up again to receive a new confirmation email.",
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">JahKnowsPR</h1>
          <p className="text-muted-foreground">Email Confirmation</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            {status === 'loading' && (
              <>
                <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin mb-4" />
                <CardTitle>Confirming Your Email</CardTitle>
                <CardDescription>
                  Please wait while we verify your email address...
                </CardDescription>
              </>
            )}
            
            {status === 'success' && (
              <>
                <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
                <CardTitle className="text-green-600">Email Confirmed!</CardTitle>
                <CardDescription>
                  Your email has been successfully verified.
                </CardDescription>
              </>
            )}
            
            {status === 'error' && (
              <>
                <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                <CardTitle className="text-red-600">Confirmation Failed</CardTitle>
                <CardDescription>
                  There was a problem confirming your email.
                </CardDescription>
              </>
            )}
          </CardHeader>
          
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              {message}
            </p>
            
            {status === 'success' && (
              <div className="space-y-3">
                <Button 
                  onClick={handleSignInRedirect}
                  className="w-full"
                  size="lg"
                >
                  Go to Dashboard
                </Button>
                <p className="text-xs text-muted-foreground">
                  You can now access all features of your account.
                </p>
              </div>
            )}
            
            {status === 'error' && (
              <div className="space-y-3">
                <Button 
                  onClick={handleResendConfirmation}
                  variant="outline"
                  className="w-full"
                >
                  Try Again
                </Button>
                <Button 
                  onClick={() => navigate('/')}
                  variant="ghost"
                  className="w-full"
                >
                  Back to Home
                </Button>
              </div>
            )}
            
            {status === 'loading' && (
              <Button 
                onClick={() => navigate('/')}
                variant="ghost"
                className="w-full"
              >
                Back to Home
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmailConfirmation;
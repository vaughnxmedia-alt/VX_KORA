import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

const SignupConfirmation = () => {
  const navigate = useNavigate();

  const handleSignInRedirect = () => {
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">JahKnowsPR</h1>
          <p className="text-muted-foreground">Account Created Successfully</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
            <CardTitle className="text-green-600">Welcome to JahKnowsPR!</CardTitle>
            <CardDescription>
              Your account has been created successfully.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Thank you for joining us! Your account is now ready to use.
            </p>
            
            <div className="space-y-3">
              <Button 
                onClick={handleSignInRedirect}
                className="w-full"
                size="lg"
              >
                Sign In to Your Account
              </Button>
              <p className="text-xs text-muted-foreground">
                You can now access all features and start building your brand blueprint.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignupConfirmation;
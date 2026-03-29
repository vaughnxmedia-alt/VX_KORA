import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, CreditCard, Lock, ArrowLeft } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useToast } from "@/hooks/use-toast";

const Payment = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Get blueprint data from URL params
  const personalInfoId = searchParams.get('personalInfoId');
  const businessInfoId = searchParams.get('businessInfoId');

  useEffect(() => {
    // Redirect if no data IDs
    if (!personalInfoId || !businessInfoId) {
      navigate('/brand-blueprint');
    }
  }, [personalInfoId, businessInfoId, navigate]);

  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      toast({
        title: "Payment Successful!",
        description: "Your brand blueprint will be delivered shortly.",
      });

      // Navigate to account page with blueprint data
      navigate(`/account?blueprintReady=true&personalInfoId=${personalInfoId}&businessInfoId=${businessInfoId}`);
    } catch (error) {
      toast({
        title: "Payment Failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-20 px-4">
        <div className="max-w-2xl mx-auto py-16">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/brand-blueprint")}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blueprint
          </Button>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary mb-4">
              Complete Your Brand Blueprint Purchase
            </h1>
            <p className="text-lg text-muted-foreground">
              Secure your comprehensive brand analysis and strategic roadmap
            </p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-accent" />
                Brand Takeover Blueprint
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span>Comprehensive Brand Analysis</span>
                  <span className="font-semibold">Included</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span>Strategic Roadmap & Action Plan</span>
                  <span className="font-semibold">Included</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span>Competitive Analysis</span>
                  <span className="font-semibold">Included</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span>Brand Positioning Recommendations</span>
                  <span className="font-semibold">Included</span>
                </div>
                
                <div className="pt-4">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground line-through">$500</span>
                      <span className="text-accent">$250</span>
                    </div>
                  </div>
                  <p className="text-sm text-accent font-semibold mt-1">50% OFF - Limited Time</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                      Secure Payment Processing
                    </span>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Your payment information is encrypted and processed securely through our payment gateway.
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Click below to proceed with secure payment processing
                  </p>
                  
                  <Button 
                    onClick={handlePayment}
                    disabled={isProcessing}
                    variant="hero"
                    size="lg"
                    className="w-full max-w-md"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Processing Payment...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Pay $250 - Complete Purchase
                      </>
                    )}
                  </Button>
                </div>

                <div className="text-xs text-center text-muted-foreground space-y-1">
                  <p>• 100% Money-back guarantee</p>
                  <p>• Delivered within 48-72 hours</p>
                  <p>• Direct email delivery to your inbox</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Payment;
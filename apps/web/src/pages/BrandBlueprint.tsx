import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

// SEO function for Brand Blueprint page
const updateBrandBlueprintSEO = () => {
  document.title = "Brand Blueprint Assessment | JahKnowsPR";
  
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute('content', 'Get your comprehensive brand blueprint. Strategic assessment and actionable recommendations to transform your brand positioning and market presence.');
  }
  
  const canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) {
    canonical.setAttribute('href', window.location.origin + '/brand-blueprint');
  }
};
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, CheckCircle, Clock, Loader2, Download } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Spinner } from "@/components/ui/spinner";

const formSchema = z.object({
    // Personal + Business Info
    firstName: z.string().min(2, "First name must be at least 2 characters"),
    lastName: z.string().min(2, "Last name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email"),
    phoneNumber: z.string().optional(),
    businessName: z.string().min(2, "Business name must be at least 2 characters"),
    websiteOrSocial: z.string().optional(),

    // Core Brand Discovery
    targetAudience: z.string().min(30, "Please describe what you offer and who it's for"),
    problemStatement: z.string().min(30, "Please describe what problem your brand solves"),
    brandPersonality: z.string().min(10, "Please provide 3-5 words that describe your brand"),
    brandGaps: z.string().min(20, "Please describe what's missing or unclear in your brand"),
    sixMonthVision: z.string().min(20, "Please describe where you want your brand to be in 6 months"),
});

type FormData = z.infer<typeof formSchema>;

const BrandBlueprint = () => {
    const [currentQuestion, setCurrentQuestion] = useState(1);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCompletingPayment, setIsCompletingPayment] = useState(false);
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    // Remove the authentication check - allow unauthenticated users to access the form
    // Authentication will be handled during form submission

    const analysisMessages = [
        "Analyzing your brand positioning...",
        "Evaluating your target audience alignment...", 
        "Assessing your competitive landscape...",
        "Examining your brand messaging clarity...",
        "Reviewing your market differentiation...",
        "Identifying growth opportunities...",
        "Crafting strategic recommendations...",
        "Finalizing your brand takeover blueprint...",
    ];

    // Define all questions
    const questions = [
        {
            id: 1,
            field: "firstName" as keyof FormData,
            label: "What's your first name?",
            type: "input",
            placeholder: "Your first name",
            required: true,
        },
        {
            id: 2,
            field: "lastName" as keyof FormData,
            label: "What's your last name?",
            type: "input",
            placeholder: "Your last name",
            required: true,
        },
        {
            id: 3,
            field: "email" as keyof FormData,
            label: "What's your email address?",
            type: "email",
            placeholder: "your@email.com",
            required: true,
        },
        {
            id: 4,
            field: "phoneNumber" as keyof FormData,
            label: "What's your phone number?",
            type: "input",
            placeholder: "(555) 123-4567",
            required: false,
            note: "Optional but helpful",
        },
        {
            id: 5,
            field: "businessName" as keyof FormData,
            label: "What's your business or brand name?",
            type: "input",
            placeholder: "Your business or brand name",
            required: true,
        },
        {
            id: 6,
            field: "websiteOrSocial" as keyof FormData,
            label: "What's your website or social media handle?",
            type: "input",
            placeholder: "@yourhandle or https://yourwebsite.com",
            required: false,
            note: "If available",
        },
        {
            id: 7,
            field: "targetAudience" as keyof FormData,
            label: "What do you offer, and who is it for?",
            type: "textarea",
            placeholder: "Tell us your product/service and ideal audience. Example: 'I offer web design services for small businesses who want to stand out online...'",
            required: true,
        },
        {
            id: 8,
            field: "problemStatement" as keyof FormData,
            label: "What problem does your brand solve?",
            type: "textarea",
            placeholder: "What's the transformation or outcome you help people achieve? What challenge do you solve for your customers?",
            required: true,
        },
        {
            id: 9,
            field: "brandPersonality" as keyof FormData,
            label: "What are 3–5 words that describe your brand's personality?",
            type: "input",
            placeholder: "Ex: Bold, soft, professional, edgy, soulful",
            required: true,
        },
        {
            id: 10,
            field: "brandGaps" as keyof FormData,
            label: "What feels missing or unclear in your brand right now?",
            type: "textarea",
            placeholder: "Ex: messaging, visuals, target audience, consistency, visibility, etc.",
            required: true,
        },
        {
            id: 11,
            field: "sixMonthVision" as keyof FormData,
            label: "Where do you want your brand to be in 6 months?",
            type: "textarea",
            placeholder: "Your goal: press, clients, income, visibility, etc. Be specific about what success looks like to you.",
            required: true,
        },
    ];

    const totalQuestions = questions.length;

  // Timer effect for analysis screen
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isAnalyzing) {
      interval = setInterval(() => {
        setElapsedTime((prev) => {
          const newTime = prev + 1;
          // Auto-complete after 3 minutes (180 seconds)
          if (newTime >= 180) {
            setIsAnalyzing(false);
            setIsSubmitted(true);
          }
          return newTime;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAnalyzing]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentMessage = () => {
    const messageIndex = Math.floor(elapsedTime / 15) % analysisMessages.length;
    return analysisMessages[messageIndex];
  };
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: "onSubmit",
    defaultValues: {
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
        businessName: "",
        websiteOrSocial: "",
        targetAudience: "",
        problemStatement: "",
        brandPersonality: "",
        brandGaps: "",
        sixMonthVision: "",
    },
    });

    // Restore form data if user completed auth flow
    useEffect(() => {
        const savedFormData = sessionStorage.getItem('brandBlueprintFormData');
        if (savedFormData && user) {
            try {
                const parsedData = JSON.parse(savedFormData);
                // Restore form data
                Object.keys(parsedData).forEach(key => {
                    form.setValue(key as keyof FormData, parsedData[key]);
                });
                
                // Clear the saved data
                sessionStorage.removeItem('brandBlueprintFormData');
                
                // Show success message
                toast({
                    title: "Welcome back!",
                    description: "Your form data has been restored. You can continue where you left off.",
                });
                
                // Go to last question or submit if all complete
                const lastQuestionIndex = questions.findIndex(q => !parsedData[q.field]);
                if (lastQuestionIndex !== -1) {
                    setCurrentQuestion(lastQuestionIndex + 1);
                } else {
                    // All questions were filled, set to submitted state
                    setIsSubmitted(true);
                }
            } catch (error) {
                console.error('Error restoring form data:', error);
                sessionStorage.removeItem('brandBlueprintFormData');
            }
        }
    }, [user, form, toast]); // questions is static, safe to omit

  // Generate PDF with form data
  const generatePDF = (data: FormData) => {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    let y = 20;
    
    // Title
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('Brand Takeover Blueprint - Client Submission', 20, y);
    y += 15;
    
    // Date
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, y);
    y += 20;
    
    // Personal Information Section
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Personal & Business Information', 20, y);
    y += 10;
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    
    const addField = (label: string, value: string) => {
      if (y > pageHeight - 30) {
        doc.addPage();
        y = 20;
      }
      doc.setFont(undefined, 'bold');
      doc.text(`${label}:`, 20, y);
      doc.setFont(undefined, 'normal');
      
      const lines = doc.splitTextToSize(value || 'Not provided', 150);
      doc.text(lines, 20, y + 5);
      y += 5 + (lines.length * 5) + 5;
    };
    
    addField('First Name', data.firstName);
    addField('Last Name', data.lastName);
    addField('Email', data.email);
    addField('Phone', data.phoneNumber || 'Not provided');
    addField('Business Name', data.businessName);
    addField('Social Handle/Website', data.websiteOrSocial || 'Not provided');
    
    y += 10;
    
    // Brand Discovery Section
    if (y > pageHeight - 30) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Brand Discovery', 20, y);
    y += 15;
    
    addField('What do you offer and who is it for', data.targetAudience);
    addField('What problem does your brand solve', data.problemStatement);
    addField('Brand personality words', data.brandPersonality);
    addField('What is missing or unclear in your brand', data.brandGaps);
    addField('6-month brand goals', data.sixMonthVision);
    
    return doc;
  };

  // Save PDF locally
  const downloadPDF = (data: FormData) => {
    const doc = generatePDF(data);
    doc.save(`brand-blueprint-${data.businessName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
  };

  // Send data via email (simulated - would need backend integration)
  const sendToEmail = async (data: FormData) => {
    try {
      // This would typically be handled by a backend service
      // For now, we'll download the PDF and show instructions
      downloadPDF(data);
      
      toast({
        title: "PDF Downloaded",
        description: `PDF saved locally. Please email the file manually to vaughnxmedia@gmail.com`,
      });
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process the request. PDF has been downloaded instead.",
        variant: "destructive",
      });
    }
  };

  // Simulate payment completion (in real app, this would be handled by payment processor)
  const simulatePaymentCompletion = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to complete payment.",
        variant: "destructive",
      });
      return;
    }

    setIsCompletingPayment(true);
    try {
      // Get the customer ID
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (customerError) {
        throw customerError;
      }

      // Update the brand blueprint payment status
      const { error: updateError } = await supabase
        .from('brand_blueprints')
        .update({
          payment_status: 'paid',
          payment_date: new Date().toISOString(),
          payment_method: 'simulated',
          payment_reference: `PAY_${Date.now()}`,
        })
        .eq('customer_id', customerData.id)
        .eq('payment_status', 'pending');

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Payment Complete!",
        description: "Your Brand Blueprint has been purchased successfully. You now have full access to the platform.",
      });

      // Redirect to dashboard after successful payment
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Error completing payment:', error);
      toast({
        title: "Payment Failed",
        description: "Failed to complete payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCompletingPayment(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    console.log("Form submitted:", data);
    
    setIsSubmitting(true);
    // Save the last question's data before proceeding
    const currentQ = questions[currentQuestion - 1];
    const currentValue = form.getValues(currentQ.field);
    
    // Update form data with current value
    const finalData = {
        ...data,
        [currentQ.field]: currentValue,
    };

    // Save all data to Supabase
    const saved = await saveAllData(finalData);
    if (!saved) return;

    setIsSubmitted(true);
    setIsSubmitting(false);
  };

    // Save all form data to Supabase at the end
    const saveAllData = async (data: FormData) => {
        if (!user) {
            // Store form data in sessionStorage to preserve it during auth flow
            sessionStorage.setItem('brandBlueprintFormData', JSON.stringify(data));
            
            // Redirect to auth page for signup
            navigate("/auth", { 
                state: { 
                    redirectTo: "/brand-blueprint",
                    message: "Please create an account to submit your Brand Blueprint questionnaire."
                }
            });
            return false;
        }

        try {
            // Upsert customer information
            const { data: customerData, error: customerError } = await supabase
                .from("customers")
                .upsert({
                    user_id: user.id,
                    first_name: data.firstName,
                    last_name: data.lastName,
                    email: data.email,
                    phone_number: data.phoneNumber,
                    business_name: data.businessName,
                    website_or_social: data.websiteOrSocial,
                })
                .select()
                .single();

            if (customerError) {
                console.error("Customer data error:", customerError);
                throw customerError;
            }

            // Insert brand blueprint data
            const { data: blueprintData, error: blueprintError } = await supabase
                .from("brand_blueprints")
                .insert({
                    customer_id: customerData.id,
                    target_audience: data.targetAudience,
                    problem_statement: data.problemStatement,
                    brand_personality: data.brandPersonality,
                    brand_gaps: data.brandGaps,
                    six_month_vision: data.sixMonthVision,
                    submitted_at: new Date().toISOString(),
                    payment_status: 'pending',
                    payment_amount: 250.00,
                })
                .select("id")
                .single();

            if (blueprintError) {
                console.error("Brand blueprint data error:", blueprintError);
                throw blueprintError;
            }

            await Promise.allSettled([
                supabase.functions.invoke("lls-record-outcome", {
                    body: {
                        tenant_id: customerData.id,
                        lead_id: data.email.trim().toLowerCase(),
                        subject_kind: "brand_blueprint",
                        subject_id: blueprintData?.id ?? customerData.id,
                        actor_kind: "client",
                        actor_id: user.id,
                        action: "intake_submitted",
                        strategy_origin: "human_defined",
                        learning_mode: "validated_learning",
                        intended_metric_type: "client_readiness",
                        actual_metric_type: "brand_blueprint_submission",
                        delta_value: 1,
                        success_flag: true,
                        revenue_impact: 250,
                        outcome_verified: true,
                        verification_source: "system",
                        verification_confidence_component: 0.9,
                        causal_method: "direct_attribution",
                        causal_confidence_component: 0.7,
                        evidence_strength_component: 0.4,
                        status: "success",
                        business_goal: "client_readiness",
                        correlation_id: data.email.trim().toLowerCase(),
                        strategy_id: "system:brand-blueprint-intake",
                        messaging_angle: "brand_blueprint_intake",
                        hook: "paid_brand_blueprint",
                        projection_version: "lls-projection-v1:brand-blueprint",
                        intended_outcome: { submitted_brand_blueprint: true },
                        actual_outcome: {
                            brand_blueprint_id: blueprintData?.id ?? null,
                            payment_status: "pending",
                        },
                        metadata: {
                            business_name: data.businessName,
                            website_or_social: data.websiteOrSocial,
                        },
                    },
                }),
            ]);

            toast({
                title: "Success!",
                description: "Your information has been saved successfully.",
            });

            return true;
        } catch (error) {
            console.error("Error saving data:", error);
            toast({
                title: "Error",
                description: "Failed to save your data. Please try again.",
                variant: "destructive",
            });
            return false;
        }
    };

    // Validate current question only
    const validateCurrentQuestion = async () => {
        const currentQ = questions[currentQuestion - 1];
        const values = form.getValues();
        const fieldValue = values[currentQ.field];
        
        // Clear errors first
        form.clearErrors(currentQ.field);

        // Skip validation for optional fields if empty
        if (!currentQ.required && (!fieldValue || fieldValue.toString().trim() === "")) {
          return true;
        }

        // Create a partial schema for just this field
        let fieldSchema;
        switch (currentQ.field) {
          case "firstName":
            fieldSchema = z.string().min(2, "First name must be at least 2 characters");
            break;
          case "lastName":
            fieldSchema = z.string().min(2, "Last name must be at least 2 characters");
            break;
          case "email":
            fieldSchema = z.string().email("Please enter a valid email");
            break;
          case "phoneNumber":
            fieldSchema = z.string().optional();
            break;
          case "businessName":
            fieldSchema = z.string().min(2, "Business name must be at least 2 characters");
            break;
          case "websiteOrSocial":
            fieldSchema = z.string().optional();
            break;
          case "targetAudience":
            fieldSchema = z.string().min(30, "Please describe what you offer and who it's for");
            break;
          case "problemStatement":
            fieldSchema = z.string().min(30, "Please describe what problem your brand solves");
            break;
          case "brandPersonality":
            fieldSchema = z.string().min(10, "Please provide 3-5 words that describe your brand");
            break;
          case "brandGaps":
            fieldSchema = z.string().min(20, "Please describe what's missing or unclear in your brand");
            break;
          case "sixMonthVision":
            fieldSchema = z.string().min(20, "Please describe where you want your brand to be in 6 months");
            break;
          default:
            return true;
        }

        const result = fieldSchema.safeParse(fieldValue);
        if (!result.success) {
          form.setError(currentQ.field, { message: result.error.errors[0].message });
          return false;
        }

        return true;
      };

  const nextQuestion = async () => {
    const isValid = await validateCurrentQuestion();
    if (!isValid) return;

    if (currentQuestion < questions.length) {
      setCurrentQuestion(prev => prev + 1);
      // Clear the input field for the next question
      setTimeout(() => {
        const nextQ = questions[currentQuestion]; // currentQuestion will be updated by the time this runs
        if (nextQ) {
          form.setValue(nextQ.field, "");
        }
      }, 0);
    }
  };

  const prevQuestion = () => {
    if (currentQuestion > 1) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  // Analysis loading screen
  if (isAnalyzing) {
    return (
      <div className="min-h-screen bg-background">
        <div className="pt-20 px-4">
          <div className="max-w-2xl mx-auto text-center py-16">
            <div className="mb-8">
              <Loader2 className="w-16 h-16 text-accent mx-auto mb-6 animate-spin" />
              <h1 className="text-3xl font-bold text-primary mb-4">Analyzing Your Brand</h1>
              <p className="text-lg text-muted-foreground mb-8">
                Our AI is processing your information to create a comprehensive brand takeover blueprint.
              </p>
            </div>

            {/* Timer Display */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <Clock className="w-5 h-5 text-accent" />
              <span className="text-2xl font-mono font-bold text-accent">
                {formatTime(elapsedTime)}
              </span>
              <span className="text-sm text-muted-foreground ml-2">/ 3:00 max</span>
            </div>

            {/* Current Analysis Message */}
            <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl p-6 mb-8 border border-border">
              <p className="text-lg text-foreground font-medium animate-fade-in">
                {getCurrentMessage()}
              </p>
            </div>

            {/* Progress Steps */}
            <div className="space-y-3 text-left max-w-md mx-auto">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-accent" />
                <span className="text-sm">Form data collected</span>
              </div>
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-accent animate-spin" />
                <span className="text-sm">AI analysis in progress...</span>
              </div>
              <div className="flex items-center gap-3 opacity-50">
                <div className="w-5 h-5 rounded-full border-2 border-muted" />
                <span className="text-sm">Blueprint generation</span>
              </div>
              <div className="flex items-center gap-3 opacity-50">
                <div className="w-5 h-5 rounded-full border-2 border-muted" />
                <span className="text-sm">Payment processing required</span>
              </div>
            </div>

            <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Note:</strong> Your blueprint will not be delivered until payment is processed on our end. 
                This ensures you receive the highest quality analysis tailored specifically to your brand.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background">
        <div className="pt-20 px-4">
          <div className="max-w-2xl mx-auto text-center py-16">
            <CheckCircle className="w-16 h-16 text-accent mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-primary mb-4">Analysis Complete!</h1>
            <p className="text-lg text-muted-foreground mb-6">
              Your brand data has been successfully analyzed and your custom Brand Takeover Blueprint is ready.
            </p>
            
            <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl p-6 mb-8 border border-border">
              <h3 className="text-xl font-semibold text-foreground mb-3">Next Steps</h3>
              <p className="text-muted-foreground mb-4">
                Your comprehensive brand takeover blueprint will be delivered to your email once payment is processed on our end.
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                This ensures you receive the highest quality analysis with personalized strategic recommendations for your brand transformation.
              </p>
              <p className="text-xs text-muted-foreground">
                A PDF copy of your submission has been saved locally and notification sent to vaughnxmedia@gmail.com
              </p>
            </div>
            
            <div className="flex gap-4 justify-center">
              <Button 
                onClick={() => {
                  const formData = form.getValues();
                  downloadPDF(formData);
                }} 
                variant="outline" 
                size="lg"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF Copy
              </Button>
              <Button 
                onClick={async () => {
                  // Simulate payment completion
                  await simulatePaymentCompletion();
                }} 
                variant="hero" 
                size="lg"
                disabled={isCompletingPayment}
              >
                {isCompletingPayment ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : "Complete Payment ($250)"}
              </Button>
              <Button onClick={() => navigate("/")} variant="outline" size="lg">
                Return to Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion - 1];

  return (
    <div className="min-h-screen bg-background">
      
      {/* Progress bar at the top of the screen */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Question {currentQuestion} of {totalQuestions}</span>
            <span>{Math.round((currentQuestion / totalQuestions) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div 
              className="bg-accent h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentQuestion / totalQuestions) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="pt-16 px-4 pb-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/")}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
            
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-primary mb-2">Get Your Brand Takeover Blueprint</h1>
              <p className="text-muted-foreground">
                Answer a few questions and receive a comprehensive brand analysis tailored to your business
              </p>
              
              {/* Pricing Section */}
              <div className="mt-6 p-6 bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl border border-border">
                <div className="flex items-center justify-center gap-4 mb-2">
                  <span className="text-2xl text-muted-foreground line-through">$500</span>
                  <span className="text-4xl font-bold text-accent">$250</span>
                </div>
                <p className="text-lg font-semibold text-accent">50% OFF</p>
              </div>
            </div>
          </div>

          <div className="text-center space-y-8">
            {/* Question Header */}
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {currentQuestion <= 11 ? "Personal & Business Info" : "Brand Discovery"}
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-primary leading-tight">
                {currentQ.label}
              </h2>
            </div>

            {/* Question Input */}
            <div className="max-w-lg mx-auto">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                  <FormField
                    control={form.control}
                    name={currentQ.field}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          {currentQ.type === "textarea" ? (
                            <Textarea 
                              placeholder={currentQ.placeholder}
                              className="min-h-[120px] text-center resize-none text-lg p-6"
                              {...field} 
                            />
                          ) : (
                            <Input 
                              type={currentQ.type}
                              placeholder={currentQ.placeholder}
                              className="text-center text-lg p-6 h-14"
                              {...field} 
                            />
                          )}
                        </FormControl>
                        <FormMessage className="text-center" />
                        {currentQ.note && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {currentQ.note}
                          </p>
                        )}
                      </FormItem>
                    )}
                  />
                  
                  {/* Navigation Buttons */}
                  <div className="flex justify-between items-center pt-8">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={prevQuestion}
                      disabled={currentQuestion === 1}
                      className="px-8"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Previous
                    </Button>
                    
                    {currentQuestion < totalQuestions ? (
                      <Button 
                        type="button" 
                        variant="hero" 
                        onClick={nextQuestion}
                        className="px-8"
                      >
                        Next
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    ) : (
                      <Button type="submit" variant="hero" className="px-8" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Spinner className="mr-2 h-4 w-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            Submit Blueprint Request
                            <CheckCircle className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandBlueprint;
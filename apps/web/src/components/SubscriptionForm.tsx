import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast as sonnerToast } from "sonner";
import { ArrowRight } from "lucide-react";
import { useToast } from "./ui/use-toast";
import { useEffect, useState } from "react";
import { Spinner } from "./ui/spinner";
import { suppressSubscriberPopupAsSignedUp } from "@/lib/subscriber-popup-storage";
import { readFreeAuditAttribution } from "@/lib/freeAuditAttribution";
import { trackFormStart, trackNewsletterSignup } from "@/lib/kora-analytics";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
});

export const SubscriptionForm = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  });

  useEffect(() => {
    trackFormStart({
      page_path: window.location.pathname,
      form_id: "subscription-form",
      form_name: "The Brief Subscription",
      funnel_id: "newsletter",
      funnel_step: "form_start",
    });
  }, []);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    const leadSource = readFreeAuditAttribution();
    const { data, error } = await supabase.functions.invoke("new-subscriber", {
      body: { record: { name: values.name, email: values.email }, leadSource },
    });

    if (error) {
      let description = "Your request could not be processed. Please try again.";
      const context = error.context;
      if (context && typeof context === 'object' && context.error && typeof context.error === 'string') {
        description = context.error;
      } else {
        description = error.message;
      }
      
      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    } else {
      suppressSubscriberPopupAsSignedUp();
      if (data?.alreadySubscribed) {
        sonnerToast.success("Request received.", {
          description: "If this email is already registered, access remains active.",
        });
      } else {
        sonnerToast.success("Request received.", {
          description: "You will receive The Brief as new editions are released.",
        });
        if (data?.access_token) {
          localStorage.setItem('theBriefAccessToken', data.access_token);
        }
      }
      form.reset();
      trackNewsletterSignup({
        page_path: window.location.pathname,
        form_id: "subscription-form",
        form_name: "The Brief Subscription",
        funnel_id: "newsletter",
        funnel_step: "submit",
        offer_id: "newsletter",
      });
      setTimeout(() => {
        window.location.href = '/the-brief?new_access=true';
      }, 1500);
    }
    setIsSubmitting(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input placeholder="Enter your name" className="h-12 text-base" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input placeholder="Enter your email address" className="h-12 text-base" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full h-12 group" variant="hero" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner className="mr-2 h-4 w-4 animate-spin" />
              Requesting...
            </>
          ) : (
            <>
              Request Brief Access
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </Button>
      </form>
    </Form>
  );
};

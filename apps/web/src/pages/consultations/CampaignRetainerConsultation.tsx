import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { prefillIntakeFromCampaignQuestionnaire } from "@/features/consultations/prefillStrategySession";

const schema = z.object({
  fullName: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(7, "Phone required"),
  businessName: z.string().min(1, "Business name required"),
  goals: z.string().min(10, "Describe your goals (10+ characters)"),
  engagement: z.string().min(1, "Select engagement type"),
  budget: z.string().min(1, "Select a range"),
});

type FormValues = z.infer<typeof schema>;

export default function CampaignRetainerConsultation() {
  const navigate = useNavigate();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      businessName: "",
      goals: "",
      engagement: "",
      budget: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    const strategySessionPrefill = prefillIntakeFromCampaignQuestionnaire(values);
    navigate("/strategy-session?kind=campaign_retainer", {
      state: { strategySessionPrefill },
    });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-muted/30 to-background px-4 py-12">
      <div className="mx-auto max-w-xl">
        <Button variant="ghost" asChild className="mb-6 -ml-2 gap-2">
          <Link to="/work-with-me">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>

        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl tracking-tight">Campaign &amp; retainer consultation</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              Short questionnaire — then you&apos;ll schedule the same paid Strategy Session so we can discuss campaigns,
              retainers, and fit.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your name" {...field} />
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
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@company.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 …" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business / brand</FormLabel>
                      <FormControl>
                        <Input placeholder="Business name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="goals"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What are you trying to achieve?</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Campaign goals, launch, always-on needs, channels…"
                          className="min-h-[100px] resize-y"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="engagement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Engagement type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select one" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Project-based campaign">Project-based campaign</SelectItem>
                          <SelectItem value="Ongoing retainer">Ongoing retainer</SelectItem>
                          <SelectItem value="Exploring both">Exploring both</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget range (optional guidance)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a range" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Under $5k">Under $5k</SelectItem>
                          <SelectItem value="$5k–$15k">$5k–$15k</SelectItem>
                          <SelectItem value="$15k–$50k">$15k–$50k</SelectItem>
                          <SelectItem value="$50k+">$50k+</SelectItem>
                          <SelectItem value="Prefer to discuss">Prefer to discuss</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" size="lg">
                  Continue to schedule
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Next: Strategy Session booking ($150). Your answers prefill the intake form.
                </p>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

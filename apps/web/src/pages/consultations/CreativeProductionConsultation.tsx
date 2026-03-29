import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { prefillIntakeFromCreativeQuestionnaire } from "@/features/consultations/prefillStrategySession";

const SCOPE_OF_WORK_OPTIONS = [
  "Brand Assets Design",
  "Brand Asset Manufacturing/Delivery",
  "Event Coordination",
  "Videography",
  "Photography",
  "Graphic Design (Flyers & Posters etc..)",
  "Website Design & Development",
  "AI Work",
] as const;

const schema = z.object({
  fullName: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(7, "Phone required"),
  businessName: z.string().min(1, "Business name required"),
  scopeOfWork: z.enum(SCOPE_OF_WORK_OPTIONS, { required_error: "Select scope of work" }),
  audience: z.string().min(5, "Who is this for?"),
  budget: z.string().min(1, "Select a budget range"),
  timeline: z.string().min(1, "Choose a timeline"),
});

type FormValues = z.infer<typeof schema>;

export default function CreativeProductionConsultation() {
  const navigate = useNavigate();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      businessName: "",
      audience: "",
      budget: "",
      timeline: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    const strategySessionPrefill = prefillIntakeFromCreativeQuestionnaire(values);
    navigate("/strategy-session?kind=creative_consultation", {
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
            <CardTitle className="text-2xl tracking-tight">Creative work &amp; production</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              Short questionnaire — then you&apos;ll pick a time for the same paid Strategy Session flow so we can align
              on scope, production needs, and timeline.
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
                  name="scopeOfWork"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scope of Work</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select scope of work" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SCOPE_OF_WORK_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="audience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Who is the audience?</FormLabel>
                      <FormControl>
                        <Input placeholder="Customers, fans, B2B buyers…" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Budget <span className="font-normal text-muted-foreground">(Min $500)</span>
                      </FormLabel>
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
                <FormField
                  control={form.control}
                  name="timeline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timeline</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select timing" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ASAP">ASAP</SelectItem>
                          <SelectItem value="1–4 weeks">1–4 weeks</SelectItem>
                          <SelectItem value="1–3 months">1–3 months</SelectItem>
                          <SelectItem value="Flexible / planning">Flexible / planning</SelectItem>
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
                  Next step: choose a slot on the Strategy Session calendar ($150). Your answers are copied into the
                  intake form.
                </p>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

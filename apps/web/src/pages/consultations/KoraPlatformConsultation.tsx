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
import { prefillIntakeFromKoraPlatformQuestionnaire } from "@/features/consultations/prefillStrategySession";

const schema = z.object({
  fullName: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(7, "Phone required"),
  businessName: z.string().min(1, "Business name required"),
  problemToSolve: z.string().min(10, "Describe what you need (10+ characters)"),
  currentStack: z.string().optional(),
  readiness: z.string().min(1, "Select readiness"),
});

type FormValues = z.infer<typeof schema>;

export default function KoraPlatformConsultation() {
  const navigate = useNavigate();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      businessName: "",
      problemToSolve: "",
      currentStack: "",
      readiness: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    const strategySessionPrefill = prefillIntakeFromKoraPlatformQuestionnaire({
      ...values,
      currentStack: values.currentStack || "",
    });
    navigate("/strategy-session?kind=full_program_sales", {
      state: { strategySessionPrefill },
    });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-muted/30 to-background px-4 py-12">
      <div className="mx-auto max-w-xl">
        <Button variant="ghost" asChild className="mb-6 -ml-2 gap-2">
          <Link to="/work-with-me#kora-platform">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>

        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl tracking-tight">Full KORA platform access</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              Short inquiry form — then you&apos;ll book the paid Strategy Session so we can assess fit and alignment
              before any platform invitation.
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
                  name="problemToSolve"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>What should KORA solve for you?</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Workflow, calendars, campaigns, agents, visibility — be specific."
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
                  name="currentStack"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current tools (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Notion, Slack, spreadsheets…" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="readiness"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Readiness</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select one" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Exploring">Exploring</SelectItem>
                          <SelectItem value="Ready in 1–3 months">Ready in 1–3 months</SelectItem>
                          <SelectItem value="Ready now">Ready now</SelectItem>
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
                  Next: Strategy Session ($150). Platform access stays invitation-based after fit is clear.
                </p>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

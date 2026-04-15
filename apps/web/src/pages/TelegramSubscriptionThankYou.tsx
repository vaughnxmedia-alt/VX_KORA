import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TelegramSubscriptionThankYou() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-background to-muted/30 px-4 py-16">
      <div className="mx-auto max-w-lg text-center space-y-6">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Check className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Subscription active</h1>
        <div className="space-y-3 text-muted-foreground leading-relaxed">
          <p className="text-foreground font-medium">
            Payment received. Check your email for your Telegram join link.
          </p>
          <p className="text-sm">
            Use the link in your email to open the bot and connect your Telegram account automatically.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/work-with-me#telegram">Back to Services</Link>
        </Button>
      </div>
    </div>
  );
}


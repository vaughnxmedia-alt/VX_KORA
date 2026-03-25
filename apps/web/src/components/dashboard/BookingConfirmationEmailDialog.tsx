import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Bold, Italic, List, Minus, Redo2, Type, Undo2 } from "lucide-react";
import {
  buildStrategySessionGuestEmailPreview,
  defaultGuestConfirmationSubject,
} from "@/features/leads/buildStrategySessionGuestEmailPreview";

const PUBLIC_SITE_URL = "https://jahknowspr.com";

export type PendingBookingForDialog = {
  id: string;
  meeting_date: string;
  timezone: string | null;
  session_type: string | null;
  full_name: string | null;
  business_name: string | null;
  email: string | null;
  host_profile: { full_name: string | null } | null;
};

function wrapTextareaSelection(el: HTMLTextAreaElement, before: string, after: string) {
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const v = el.value;
  const selected = v.slice(start, end);
  const next = v.slice(0, start) + before + selected + after + v.slice(end);
  el.value = next;
  const innerStart = start + before.length;
  el.setSelectionRange(innerStart, innerStart + selected.length);
  el.focus();
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: PendingBookingForDialog | null;
  onSend: (payload: { guestHtml: string; guestSubject: string; generatedBy: "human" | "gemini" }) => Promise<void>;
  onGenerateDraft: () => Promise<{ subject: string; bodyHtml: string }>;
  isSending: boolean;
  isGeneratingDraft: boolean;
};

export function BookingConfirmationEmailDialog({
  open,
  onOpenChange,
  meeting,
  onSend,
  onGenerateDraft,
  isSending,
  isGeneratingDraft,
}: Props) {
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [generatedBy, setGeneratedBy] = useState<"human" | "gemini">("human");

  useEffect(() => {
    if (!open || !meeting) return;

    const guestEmail = String(meeting.email || "").trim();
    setTo(guestEmail);
    setSubject(defaultGuestConfirmationSubject());

    const hostDisplayName = meeting.host_profile?.full_name?.trim() || "Your strategist";
    const slotDate = new Date(meeting.meeting_date);
    const tz = meeting.timezone || "America/New_York";
    const dateFmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(slotDate);
    const timeFmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
    }).format(slotDate);
    const sessionType = meeting.session_type === "in_person" ? "in_person" : "zoom";

    const html = buildStrategySessionGuestEmailPreview({
      fullName: String(meeting.full_name || ""),
      businessName: String(meeting.business_name || ""),
      sessionType,
      meetingDateFormatted: dateFmt,
      meetingTimeFormatted: timeFmt,
      timezoneLabel: tz,
      hostDisplayName,
      questionnaireUrl: `${PUBLIC_SITE_URL}/strategy-session`,
      publicSiteUrl: PUBLIC_SITE_URL,
    });
    setBody(html);
    setGeneratedBy("human");
  }, [open, meeting]);

  const handleToolbar = (action: "bold" | "italic" | "li") => {
    const el = bodyRef.current;
    if (!el) return;
    if (action === "bold") wrapTextareaSelection(el, "<strong>", "</strong>");
    if (action === "italic") wrapTextareaSelection(el, "<em>", "</em>");
    if (action === "li") wrapTextareaSelection(el, "<li>", "</li>");
    setBody(el.value);
  };

  const handleSubmit = async () => {
    if (!meeting?.id) return;
    await onSend({ guestHtml: body, guestSubject: subject, generatedBy });
  };

  const handleGenerateDraft = async () => {
    const draft = await onGenerateDraft();
    if (draft.subject?.trim()) setSubject(draft.subject.trim());
    if (draft.bodyHtml?.trim()) setBody(draft.bodyHtml.trim());
    setGeneratedBy("gemini");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <div className="flex items-center justify-between bg-sky-100/90 px-4 py-3 text-sky-950 dark:bg-sky-950/40 dark:text-sky-50">
          <DialogTitle className="text-base font-semibold tracking-tight">New Message</DialogTitle>
          <div className="flex items-center gap-1 opacity-60">
            <button type="button" className="rounded p-1 hover:bg-sky-200/50 dark:hover:bg-sky-800/50" aria-hidden>
              <Minus className="h-4 w-4" />
            </button>
            <button type="button" className="rounded p-1 hover:bg-sky-200/50 dark:hover:bg-sky-800/50" aria-hidden>
              <Type className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-0 px-1">
          <div className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center">
            <span className="w-14 shrink-0 text-sm text-muted-foreground">From</span>
            <span className="min-w-0 flex-1 font-mono text-sm">
              Jah Jah &lt;welcome@jahknowspr.com&gt;
            </span>
          </div>
          <Separator />
          <div className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center">
            <Label htmlFor="compose-to" className="w-14 shrink-0 text-sm text-muted-foreground">
              To
            </Label>
            <Input
              id="compose-to"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-9 border-0 px-0 shadow-none focus-visible:ring-0"
              readOnly
            />
          </div>
          <Separator />
          <div className="flex flex-col gap-1 px-3 py-2 sm:flex-row sm:items-center">
            <Label htmlFor="compose-subject" className="w-14 shrink-0 text-sm text-muted-foreground">
              Subject
            </Label>
            <Input
              id="compose-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="h-9 border-0 px-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <Separator />
        </div>

        <div className="border-t bg-muted/20 px-2 py-2">
          <textarea
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-[280px] w-full resize-y rounded-md border bg-background px-3 py-2 font-mono text-sm leading-relaxed shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            spellCheck
          />
          <div className="mt-2 flex flex-wrap items-center gap-1 rounded-full border bg-muted/50 px-2 py-1.5">
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Undo" disabled>
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Redo" disabled>
              <Redo2 className="h-4 w-4" />
            </Button>
            <span className="mx-1 h-5 w-px bg-border" />
            <span className="rounded border bg-background px-2 py-0.5 text-xs text-muted-foreground">Sans Serif</span>
            <span className="mx-1 h-5 w-px bg-border" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Bold"
              onClick={() => handleToolbar("bold")}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Italic"
              onClick={() => handleToolbar("italic")}
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="List item"
              onClick={() => handleToolbar("li")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Guest email is HTML. Ops still receives the standard internal notification. Confirming sets the meeting to
            confirmed in the Meetings tab.
          </p>
        </div>

        <DialogFooter className="gap-2 border-t bg-background px-4 py-3 sm:justify-end">
          <Button type="button" variant="secondary" onClick={handleGenerateDraft} disabled={isGeneratingDraft || isSending || !meeting?.id}>
            {isGeneratingDraft ? "Generating…" : "Generate with Gemini"}
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSending}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSending || !meeting?.id}>
            {isSending ? "Sending…" : "Confirm email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

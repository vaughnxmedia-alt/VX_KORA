import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Heart, Sparkles, Send } from "lucide-react";

interface RatingPopupProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (rating: number, feedback: string) => void;
  activeDays: number;
}

export function RatingPopup({ open, onClose, onSubmit, activeDays }: RatingPopupProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [feedback, setFeedback] = useState("");
  const [step, setStep] = useState<"rating" | "feedback" | "thanks">("rating");

  useEffect(() => {
    if (open) {
      setRating(0);
      setHoveredRating(0);
      setFeedback("");
      setStep("rating");
    }
  }, [open]);

  const handleRatingSelect = (value: number) => {
    setRating(value);
    setStep("feedback");
  };

  const handleSubmit = () => {
    onSubmit(rating, feedback);
    setStep("thanks");
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        {step === "rating" && (
          <>
            <DialogHeader>
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
              </div>
              <DialogTitle className="text-center text-xl">
                You've been on fire lately! 🔥
              </DialogTitle>
              <DialogDescription className="text-center">
                {activeDays} active days and counting! How has your KORA experience been?
              </DialogDescription>
            </DialogHeader>
            <div className="py-6">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    onClick={() => handleRatingSelect(value)}
                    onMouseEnter={() => setHoveredRating(value)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="p-2 transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-10 h-10 transition-colors ${
                        value <= (hoveredRating || rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-center text-sm text-muted-foreground mt-4">
                Click a star to rate your experience
              </p>
            </div>
            <div className="flex justify-center">
              <Button variant="ghost" onClick={handleSkip} className="text-muted-foreground">
                Maybe later
              </Button>
            </div>
          </>
        )}

        {step === "feedback" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-center">
                {rating >= 4 ? "Awesome! 🎉" : rating >= 3 ? "Thanks for the feedback!" : "We hear you 💜"}
              </DialogTitle>
              <DialogDescription className="text-center">
                {rating >= 4
                  ? "We're thrilled you're enjoying KORA! Any thoughts to share?"
                  : "What could we do better? Your feedback helps us improve."}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="flex justify-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((value) => (
                  <Star
                    key={value}
                    className={`w-6 h-6 ${
                      value <= rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }`}
                  />
                ))}
              </div>
              <Textarea
                placeholder={
                  rating >= 4
                    ? "What do you love about KORA? (optional)"
                    : "How can we improve? (optional)"
                }
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div className="flex justify-between gap-3">
              <Button variant="outline" onClick={() => setStep("rating")}>
                Back
              </Button>
              <Button onClick={handleSubmit} className="flex-1">
                <Send className="w-4 h-4 mr-2" />
                Submit Feedback
              </Button>
            </div>
          </>
        )}

        {step === "thanks" && (
          <div className="py-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                <Heart className="w-8 h-8 text-white fill-white" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-2">Thank you!</h3>
            <p className="text-muted-foreground">
              Your feedback helps us make KORA even better.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

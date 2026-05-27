import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RotateCw, ThumbsUp, ThumbsDown, Sparkles, Flame, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { addDays, format, isBefore, isEqual, startOfDay } from "date-fns";

export const Route = createFileRoute("/_authenticated/flashcards")({ component: FlashCards });

function FlashCards() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Fetch all flashcards
  const { data: flashcards = [], isLoading: cardsLoading } = useQuery({
    queryKey: ["flashcards"],
    queryFn: async () => {
      const { data } = await supabase.from("flashcards").select("*");
      return data || [];
    },
  });

  // Fetch user reviews
  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ["flashcard_reviews", userId],
    queryFn: async () => {
      const { data } = await supabase.from("flashcard_reviews").select("*").eq("user_id", userId!);
      return data || [];
    },
    enabled: !!userId,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ flashcardId, ease, intervalDays, nextReview, count }: any) => {
      const payload = {
        user_id: userId!,
        flashcard_id: flashcardId,
        ease,
        interval_days: intervalDays,
        next_review: nextReview,
        last_reviewed: new Date().toISOString(),
        reviews_count: count,
      };

      const { error } = await supabase.from("flashcard_reviews").upsert(payload, { onConflict: "user_id, flashcard_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["flashcard_reviews", userId] });
    }
  });

  if (cardsLoading || reviewsLoading) return <div className="p-10 flex justify-center"><div className="animate-pulse">Loading...</div></div>;

  const today = startOfDay(new Date());
  
  // Filter due cards
  const dueCards = flashcards.filter(card => {
    const review = reviews.find(r => r.flashcard_id === card.id);
    if (!review) return true; // Never reviewed
    const nextDate = startOfDay(new Date(review.next_review));
    return isBefore(nextDate, today) || isEqual(nextDate, today);
  });

  const handleReview = (quality: "again" | "good" | "easy") => {
    const activeCard = dueCards[currentIndex];
    const review = reviews.find(r => r.flashcard_id === activeCard.id) || { ease: 2, interval_days: 1, reviews_count: 0 };
    
    let newEase = review.ease;
    let newInterval = review.interval_days;

    if (quality === "again") {
      newEase = Math.max(1, newEase - 1);
      newInterval = 1;
    } else if (quality === "good") {
      newInterval = Math.max(1, Math.round(newInterval * Math.max(1.6, newEase * 0.9)));
    } else if (quality === "easy") {
      newEase += 1;
      newInterval = Math.max(2, Math.round(newInterval * newEase));
    }

    const nextDate = addDays(new Date(), newInterval);

    reviewMutation.mutate({
      flashcardId: activeCard.id,
      ease: newEase,
      intervalDays: newInterval,
      nextReview: format(nextDate, "yyyy-MM-dd"),
      count: review.reviews_count + 1
    });

    setIsFlipped(false);
    setTimeout(() => {
      // Don't advance index, array shrinks because React Query refetches, but let's manage it optimistically for UX
      // Actually, since we invalidate, dueCards will shrink. 
      // If we just keep index 0, it works as a stack.
      // But we wait for invalidation, so we can just let it refetch or advance manually.
      // Easiest is to pop from dueCards locally to make it instantly disappear, but React Query handles it.
      // We'll rely on the re-render.
    }, 150);
  };

  const activeCard = dueCards[0];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 md:p-10 min-h-[80vh] flex flex-col">
      <div className="text-center mb-4">
        <h1 className="font-display text-4xl text-[var(--gold)]">Active Recall</h1>
        <p className="text-muted-foreground mt-2">Spaced repetition for CA concepts</p>
      </div>

      {dueCards.length === 0 ? (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
          <div className="size-24 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto">
            <Flame className="size-12" />
          </div>
          <div>
            <h2 className="font-display text-4xl mb-2">Session Complete!</h2>
            <p className="text-muted-foreground">You've reviewed all due flashcards for today.</p>
          </div>
        </motion.div>
      ) : (
        <div className="flex-1 flex flex-col items-center">
          <div className="w-full max-w-md flex justify-between items-center mb-4 px-2">
            <span className="text-sm font-medium bg-secondary px-3 py-1 rounded-full text-muted-foreground">Due: {dueCards.length}</span>
            <span className="text-sm font-medium bg-[var(--gold)]/10 text-[var(--gold)] px-3 py-1 rounded-full flex items-center gap-1">
              <Sparkles className="size-3" /> Focus Mode
            </span>
          </div>

          <div className="relative w-full max-w-md aspect-[3/4] perspective-1000">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCard.id + (isFlipped ? "-flipped" : "")}
                initial={{ opacity: 0, rotateX: isFlipped ? -90 : 90 }}
                animate={{ opacity: 1, rotateX: 0 }}
                exit={{ opacity: 0, rotateX: isFlipped ? 90 : -90 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0"
              >
                <Card 
                  className={`w-full h-full cursor-pointer flex flex-col justify-center items-center text-center p-8 border-2 transition-colors relative overflow-hidden ${
                    !isFlipped 
                      ? 'border-[var(--gold)]/30 hover:border-[var(--gold)]/70 bg-gradient-to-br from-background via-background to-[var(--gold)]/5' 
                      : 'border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10'
                  }`}
                  onClick={() => !isFlipped && setIsFlipped(true)}
                >
                  <CardContent className="p-0 z-10 w-full relative">
                    {!isFlipped ? (
                      <>
                        <h3 className="font-display text-3xl md:text-4xl leading-tight mb-8 bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">
                          {activeCard.front}
                        </h3>
                        <div className="flex items-center justify-center gap-2 text-[var(--gold)] text-sm font-medium animate-pulse">
                          <RotateCw className="size-4" /> Tap to flip
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="absolute -top-12 -left-4 text-9xl text-primary/10 font-serif leading-none">"</div>
                        <h3 className="text-2xl md:text-3xl font-medium leading-relaxed text-primary">
                          {activeCard.back}
                        </h3>
                        <div className="absolute -bottom-12 -right-4 text-9xl text-primary/10 font-serif leading-none rotate-180">"</div>
                      </>
                    )}
                  </CardContent>
                  
                  {/* Decorative background elements */}
                  {!isFlipped && (
                    <div className="absolute -bottom-24 -right-24 size-48 bg-[var(--gold)]/10 rounded-full blur-3xl pointer-events-none" />
                  )}
                  {isFlipped && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
                  )}
                </Card>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Action Buttons */}
          <div className={`mt-8 flex gap-4 transition-opacity duration-300 ${isFlipped ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            <Button variant="outline" size="lg" className="h-16 px-6 border-red-500/20 hover:bg-red-500/10 hover:text-red-500 flex flex-col gap-1" onClick={() => handleReview("again")}>
              <ThumbsDown className="size-5" />
              <span className="text-xs">Again</span>
            </Button>
            <Button variant="outline" size="lg" className="h-16 px-6 border-blue-500/20 hover:bg-blue-500/10 hover:text-blue-500 flex flex-col gap-1" onClick={() => handleReview("good")}>
              <CheckCircle2 className="size-5" />
              <span className="text-xs">Good</span>
            </Button>
            <Button variant="outline" size="lg" className="h-16 px-6 border-emerald-500/20 hover:bg-emerald-500/10 hover:text-emerald-500 flex flex-col gap-1" onClick={() => handleReview("easy")}>
              <ThumbsUp className="size-5" />
              <span className="text-xs">Easy</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Dumbbell } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ShimmeringText } from "@/components/ui/shimmering-text";

const MESSAGES = [
  "Agent is thinking...",
  "Processing your request...",
  "Analyzing your data...",
  "Generating your Fitness Plan...",
  "Almost there...",
];

// Cumulative delays (ms) at which each message appears
const DELAYS = [0, 4000, 8000, 14000, 29000];

interface PlanGenerationDialogProps {
  open: boolean;
}

export function PlanGenerationDialog({ open }: PlanGenerationDialogProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    if (!open) {
      setMessageIndex(0);
      return;
    }

    for (let i = 1; i < MESSAGES.length; i++) {
      const id = setTimeout(() => setMessageIndex(i), DELAYS[i]);
      timersRef.current.push(id);
    }

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [open]);

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="sm:max-w-sm text-center"
      >
        <div className="flex flex-col items-center gap-6 py-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Dumbbell className="h-8 w-8 animate-bounce text-primary" />
          </div>

          <div className="space-y-2">
            <div className="flex min-h-8 items-center justify-center text-xl font-semibold">
              <AnimatePresence mode="wait">
                <motion.div
                  key={messageIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <ShimmeringText
                    text={MESSAGES[messageIndex]}
                    duration={2.5}
                    spread={3}
                    startOnView={false}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
            <p className="text-sm text-muted-foreground">
              This may take up to a minute...
            </p>
          </div>

          {/* Progress dots */}
          <div className="flex gap-1.5">
            {MESSAGES.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i <= messageIndex
                    ? "w-4 bg-primary"
                    : "w-1.5 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

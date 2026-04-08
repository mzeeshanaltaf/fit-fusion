"use client";

import { useEffect, useRef, useState } from "react";
import { Dumbbell } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

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
    // Clear any running timers first
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    if (!open) {
      setMessageIndex(0);
      return;
    }

    // Schedule transitions for messages 1–4 (message 0 shown immediately)
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
            <p className="animate-gradient-text text-xl font-semibold">
              {MESSAGES[messageIndex]}
            </p>
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

"use client";

import { useState } from "react";
import { PlayIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

/** A "Watch" button for one exercise row; the video only loads once the dialog is opened. */
export function YouTubePlayerDialog({
  videoId,
  exerciseName,
}: {
  videoId: string;
  exerciseName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={() => setOpen(true)}
        aria-label={`Watch ${exerciseName}`}
      >
        <PlayIcon aria-hidden />
        <span className="hidden sm:inline">Watch</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <div className="border-b border-border px-5 py-4 pr-12">
            <DialogTitle className="t-heading">{exerciseName}</DialogTitle>
            <DialogDescription className="sr-only">Exercise demonstration video</DialogDescription>
          </div>
          <div className="relative aspect-video w-full bg-foreground">
            {open && (
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                title={exerciseName}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface YouTubePlayerDialogProps {
  videoId: string;
  exerciseName: string;
}

export function YouTubePlayerDialog({
  videoId,
  exerciseName,
}: YouTubePlayerDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Thumbnail trigger */}
      <button
        onClick={() => setOpen(true)}
        className="group relative aspect-video w-full shrink-0 cursor-pointer overflow-hidden rounded-md sm:w-56"
        aria-label={`Play ${exerciseName} video`}
      >
        <img
          src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
          alt={exerciseName}
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/30 transition-colors group-hover:bg-black/50" />
        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 shadow-md transition-transform group-hover:scale-110">
            <Play className="ml-0.5 h-4 w-4 fill-red-600 text-red-600" />
          </div>
        </div>
      </button>

      {/* Popup player */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <div className="border-b border-border px-6 py-4">
            <DialogTitle>{exerciseName}</DialogTitle>
          </div>
          <div className="relative aspect-video w-full">
            {open && (
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
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

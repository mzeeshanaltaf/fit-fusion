"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CheckCircle, Loader2, Send } from "lucide-react";

const NAME_MAX = 30;
const MESSAGE_MAX = 1000;

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function ContactDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const emailValid = isValidEmail(email);
  const canSubmit =
    name.trim().length > 0 &&
    name.length <= NAME_MAX &&
    emailValid &&
    message.trim().length > 0 &&
    message.length <= MESSAGE_MAX;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
      });
      if (!res.ok) throw new Error("Failed");
      setSubmitted(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(value: boolean) {
    setOpen(value);
    if (!value) {
      // Reset after dialog closes
      setTimeout(() => {
        setName("");
        setEmail("");
        setMessage("");
        setSubmitted(false);
      }, 300);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {!submitted && (
          <DialogHeader>
            <DialogTitle>Contact Us</DialogTitle>
            <DialogDescription>
              Have a question or feedback? Send us a message and we&apos;ll get
              back to you shortly.
            </DialogDescription>
          </DialogHeader>
        )}

        {submitted ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Message sent!</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Thank you for your message. We will get back to you as soon as
                possible.
              </p>
            </div>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="contact-name">
                Name{" "}
                <span
                  className={`text-xs ${name.length > NAME_MAX ? "text-destructive" : "text-muted-foreground"}`}
                >
                  ({name.length}/{NAME_MAX})
                </span>
              </Label>
              <Input
                id="contact-name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={NAME_MAX + 1}
                autoComplete="name"
              />
              {name.length > NAME_MAX && (
                <p className="text-xs text-destructive">
                  Name must be {NAME_MAX} characters or fewer.
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              {email && !emailValid && (
                <p className="text-xs text-destructive">
                  Please enter a valid email address.
                </p>
              )}
            </div>

            {/* Message */}
            <div className="space-y-1.5">
              <Label htmlFor="contact-message">
                Message{" "}
                <span
                  className={`text-xs ${message.length > MESSAGE_MAX ? "text-destructive" : "text-muted-foreground"}`}
                >
                  ({message.length}/{MESSAGE_MAX})
                </span>
              </Label>
              <Textarea
                id="contact-message"
                placeholder="Write your message here…"
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={MESSAGE_MAX + 1}
              />
              {message.length > MESSAGE_MAX && (
                <p className="text-xs text-destructive">
                  Message must be {MESSAGE_MAX} characters or fewer.
                </p>
              )}
            </div>

            <Button type="submit" className="w-full gap-2" disabled={!canSubmit || loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Message
                </>
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

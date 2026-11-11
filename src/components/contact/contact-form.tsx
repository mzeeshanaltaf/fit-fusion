"use client";

import { useState } from "react";
import { SendIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Field, FieldHint, FieldLabel } from "@/components/ui/field";

type Status = "idle" | "loading" | "success" | "error";

type Props = {
  initialSuccess?: boolean;
  initialError?: string;
};

const MESSAGE_MAX = 1000;

export function ContactForm({ initialSuccess = false, initialError }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  // Honeypot value. Kept in state so the hydrated React submit forwards it too.
  // The field name is deliberately non-semantic ("hp_field") so browser/Google
  // autofill does not recognise it as a real field and pre-populate it.
  const [hpField, setHpField] = useState("");

  const [status, setStatus] = useState<Status>(
    initialSuccess ? "success" : initialError ? "error" : "idle"
  );
  const [errorMsg, setErrorMsg] = useState(initialError ?? "");

  // When React is hydrated, onSubmit intercepts and uses fetch (enhanced UX).
  // When hydration fails, the native action="/api/contact" POST fires instead.
  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !message.trim()) {
      setStatus("error");
      setErrorMsg("Fill in your name, email and message, then send again.");
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message, hp_field: hpField }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMsg(data.message ?? "Something went wrong. Try again.");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Sending failed. Check your connection and try again.");
    }
  };

  if (status === "success") {
    return (
      <div className="grid gap-5">
        <Alert variant="success">
          <AlertTitle>Message sent</AlertTitle>
          <AlertDescription>
            Thanks. If it needs a reply, it goes to the email you gave.
          </AlertDescription>
        </Alert>
        <div>
          <Button
            variant="outline"
            onClick={() => {
              setName("");
              setEmail("");
              setMessage("");
              setStatus("idle");
            }}
          >
            Send another
          </Button>
        </div>
      </div>
    );
  }

  const over = message.length >= MESSAGE_MAX;

  return (
    <form
      action="/api/contact"
      method="post"
      onSubmit={handleSubmit}
      noValidate
      className="grid gap-5"
    >
      {/* Honeypot: visually hidden, off the a11y tree, off the tab order, and
          autocomplete disabled. Real users never see or fill it; bots that
          auto-fill every input get flagged server-side. */}
      <div
        aria-hidden="true"
        className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden"
      >
        <label htmlFor="hp_field">Leave this field empty</label>
        <input
          id="hp_field"
          name="hp_field"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={hpField}
          onChange={(e) => setHpField(e.target.value)}
        />
      </div>

      <Field>
        <FieldLabel htmlFor="name">Name</FieldLabel>
        <Input
          id="name"
          name="name"
          type="text"
          required
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="message">Message</FieldLabel>
        <Textarea
          id="message"
          name="message"
          required
          rows={7}
          maxLength={MESSAGE_MAX}
          aria-describedby="message-count"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="resize-y"
        />
        <FieldHint id="message-count" className={over ? "font-semibold text-foreground" : undefined}>
          <span className="t-num">{message.length}</span> of {MESSAGE_MAX.toLocaleString("en-US")} characters
        </FieldHint>
      </Field>

      {status === "error" && (
        <Alert variant="destructive">
          <AlertTitle>Message not sent</AlertTitle>
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
      )}

      <div>
        <Button
          type="submit"
          size="lg"
          loading={status === "loading"}
          className="w-full sm:w-auto"
        >
          {status === "loading" ? (
            "Sending"
          ) : (
            <>
              <SendIcon />
              Send message
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

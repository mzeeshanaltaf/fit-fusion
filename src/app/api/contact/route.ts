import { NextRequest, NextResponse } from "next/server";

const CONTACT_WEBHOOK = "https://n8n.zeeshanai.cloud/webhook/43cd4b4b-65be-4ce7-97d2-d9095f5b41be";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, message } = body;

  if (!name || !email || !message) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  const res = await fetch(CONTACT_WEBHOOK, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.N8N_API_KEY ?? "",
    },
    body: JSON.stringify({ name, email, message }),
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    return NextResponse.json({ error: "Failed to submit contact form." }, { status: res.status });
  }

  return NextResponse.json(data);
}

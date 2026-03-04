import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { callN8nWebhook } from "@/lib/n8n";
import { N8N_WEBHOOKS } from "@/lib/constants";
import type { FitnessPlan } from "@/lib/types";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const plans = await callN8nWebhook<FitnessPlan[]>(
      N8N_WEBHOOKS.GET_FITNESS_PLANS,
      { event_type: "get_fitness_plan", user_id: userId }
    );
    return NextResponse.json(plans);
  } catch (error) {
    console.error("Get fitness plans error:", error);
    return NextResponse.json(
      { error: "Failed to fetch plans" },
      { status: 500 }
    );
  }
}

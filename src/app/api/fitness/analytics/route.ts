import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { callN8nWebhook } from "@/lib/n8n";
import { N8N_WEBHOOKS } from "@/lib/constants";
import type { UserAnalytics } from "@/lib/types";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const analytics = await callN8nWebhook<UserAnalytics[]>(
      N8N_WEBHOOKS.USER_ANALYTICS,
      { event_type: "user_analytics", user_id: userId }
    );
    return NextResponse.json(analytics[0] ?? { total_fitness_plan: "0" });
  } catch (error) {
    console.error("User analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

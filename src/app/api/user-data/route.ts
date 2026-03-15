import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { callN8nWebhook } from "@/lib/n8n";
import { N8N_WEBHOOKS } from "@/lib/constants";
import type { UserDataResponse } from "@/lib/types";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await callN8nWebhook<UserDataResponse[]>(
      N8N_WEBHOOKS.USER_DATA,
      { event_type: "get_user_data", user_id: userId }
    );
    return NextResponse.json(data[0] ?? {
      fitness_plans: [],
      total_fitness_plan: "0",
      current_balance: 0,
      credit_history: [],
    });
  } catch (error) {
    console.error("User data error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user data" },
      { status: 500 }
    );
  }
}

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { callN8nWebhook } from "@/lib/n8n";
import { N8N_WEBHOOKS } from "@/lib/constants";
import type { CreditBalance, CreditTransaction } from "@/lib/types";

// GET /api/credits?type=balance   -> get remaining credits
// GET /api/credits?type=history   -> get credit history
export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "balance";

  try {
    if (type === "history") {
      const history = await callN8nWebhook<CreditTransaction[]>(
        N8N_WEBHOOKS.CREDITS,
        { event_type: "credit_history", user_id: userId }
      );
      return NextResponse.json(history);
    }

    const balance = await callN8nWebhook<CreditBalance[]>(
      N8N_WEBHOOKS.CREDITS,
      { event_type: "get_remaining_credit", user_id: userId }
    );
    return NextResponse.json(balance[0] ?? { current_balance: 0 });
  } catch (error) {
    console.error("Credits API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch credits" },
      { status: 500 }
    );
  }
}

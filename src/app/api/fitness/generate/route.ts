import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { callN8nWebhook } from "@/lib/n8n";
import { N8N_WEBHOOKS } from "@/lib/constants";
import type { GeneratePlanResponse } from "@/lib/types";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { age, weight_kg, gender, height_cm, fitness_goal, training_level } =
      body;

    if (
      !age ||
      !weight_kg ||
      !gender ||
      !height_cm ||
      !fitness_goal ||
      !training_level
    ) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    const result = await callN8nWebhook<GeneratePlanResponse>(
      N8N_WEBHOOKS.FITNESS_PLAN,
      {
        event_type: "fitness-plan",
        user_id: userId,
        age: Number(age),
        weight_kg: Number(weight_kg),
        gender,
        height_cm: Number(height_cm),
        fitness_goal,
        training_level,
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Generate fitness plan error:", error);
    return NextResponse.json(
      { error: "Failed to generate fitness plan" },
      { status: 500 }
    );
  }
}

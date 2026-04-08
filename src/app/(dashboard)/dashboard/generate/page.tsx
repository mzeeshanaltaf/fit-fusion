"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Dumbbell } from "lucide-react";
import {
  FITNESS_GOALS,
  TRAINING_LEVELS,
  GENDER_OPTIONS,
} from "@/lib/constants";
import { useDashboardData } from "@/components/dashboard/dashboard-context";
import { PlanGenerationDialog } from "@/components/dashboard/plan-generation-dialog";

const PROFILE_STORAGE_KEY = "fitfusion-profile-defaults";

interface ProfileDefaults {
  age: string;
  weight_kg: string;
  height_cm: string;
  gender: string;
}

export default function GeneratePlanPage() {
  const router = useRouter();
  const { creditBalance, refresh } = useDashboardData();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    age: "",
    weight_kg: "",
    height_cm: "",
    gender: "",
    fitness_goal: "",
    training_level: "",
  });

  useEffect(() => {
    // Load profile defaults from localStorage
    try {
      const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (saved) {
        const defaults: ProfileDefaults = JSON.parse(saved);
        setForm((prev) => ({
          ...prev,
          age: defaults.age || prev.age,
          weight_kg: defaults.weight_kg || prev.weight_kg,
          height_cm: defaults.height_cm || prev.height_cm,
          gender: defaults.gender || prev.gender,
        }));
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (creditBalance <= 0) {
      toast.error("No credits remaining. Please upgrade your plan.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/fitness/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      toast.success("Fitness plan generated successfully!");
      await refresh();
      router.push("/dashboard/plans");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  const isFormValid =
    form.age &&
    form.weight_kg &&
    form.height_cm &&
    form.gender &&
    form.fitness_goal &&
    form.training_level;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Generate Fitness Plan
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your profile and goals to generate a personalized workout and
          nutrition plan.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5" />
                Your Profile
              </CardTitle>
              <CardDescription className="mt-1">
                Fill in your details below. All fields are required.
              </CardDescription>
            </div>
            <Badge variant="secondary">
              {creditBalance} credit{creditBalance !== 1 ? "s" : ""} remaining
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Physical profile */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="e.g. 30"
                  min={10}
                  max={100}
                  value={form.age}
                  onChange={(e) => updateField("age", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select
                  key={form.gender || "unset"}
                  value={form.gender || undefined}
                  onValueChange={(v) => updateField("gender", v)}
                >
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  placeholder="e.g. 75"
                  min={20}
                  max={300}
                  value={form.weight_kg}
                  onChange={(e) => updateField("weight_kg", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  placeholder="e.g. 175"
                  min={100}
                  max={250}
                  value={form.height_cm}
                  onChange={(e) => updateField("height_cm", e.target.value)}
                />
              </div>
            </div>

            {/* Fitness settings */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="goal">Fitness Goal</Label>
                <Select
                  value={form.fitness_goal}
                  onValueChange={(v) => updateField("fitness_goal", v)}
                >
                  <SelectTrigger id="goal">
                    <SelectValue placeholder="Select a goal" />
                  </SelectTrigger>
                  <SelectContent>
                    {FITNESS_GOALS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="level">Training Level</Label>
                <Select
                  value={form.training_level}
                  onValueChange={(v) => updateField("training_level", v)}
                >
                  <SelectTrigger id="level">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRAINING_LEVELS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !isFormValid}
              className="w-full gap-2 sm:w-auto"
            >
              <>
                <Dumbbell className="h-4 w-4" />
                Generate Plan
              </>
            </Button>
          </form>
        </CardContent>
      </Card>

      <PlanGenerationDialog open={loading} />
    </div>
  );
}

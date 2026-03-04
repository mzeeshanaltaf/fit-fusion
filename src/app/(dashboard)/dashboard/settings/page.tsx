"use client";

import { useState, useEffect } from "react";
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
import { toast } from "sonner";
import { Save, Trash2, Settings } from "lucide-react";
import { GENDER_OPTIONS } from "@/lib/constants";

const PROFILE_STORAGE_KEY = "fitfusion-profile-defaults";

interface ProfileDefaults {
  age: string;
  weight_kg: string;
  height_cm: string;
  gender: string;
}

export default function SettingsPage() {
  const [form, setForm] = useState<ProfileDefaults>({
    age: "",
    weight_kg: "",
    height_cm: "",
    gender: "",
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (saved) {
        setForm(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  function updateField(field: keyof ProfileDefaults, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(form));
    toast.success("Profile defaults saved. They will pre-fill the generate form.");
  }

  function handleClear() {
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    setForm({ age: "", weight_kg: "", height_cm: "", gender: "" });
    toast.success("Profile defaults cleared.");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your profile defaults and preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Profile Defaults
          </CardTitle>
          <CardDescription>
            Save your profile details so they auto-fill when generating new
            fitness plans. Stored locally in your browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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
                value={form.gender}
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

          <div className="flex gap-3">
            <Button onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" />
              Save Defaults
            </Button>
            <Button variant="outline" onClick={handleClear} className="gap-2">
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

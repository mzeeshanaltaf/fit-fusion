"use client";

import { useEffect, useRef, useState } from "react";
import { SaveIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadError } from "@/components/dashboard/load-error";
import { PageHeader, Section } from "@/components/dashboard/page-header";
import { PlanFields } from "@/components/dashboard/plan-fields";
import {
  emptyForm,
  formFromProfile,
  toProfileUpdate,
  validatePlanForm,
  type FormErrors,
  type PlanFormState,
} from "@/components/dashboard/plan-form";
import { api, ApiError } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import { formatDateTime } from "@/lib/format";
import { useAsync } from "@/lib/use-async";

export default function SettingsPage() {
  const { data: session } = useSession();
  const profile = useAsync((s) => api.getProfile(s), "profile");
  const equipment = useAsync((s) => api.equipment(s), "equipment");

  const [form, setForm] = useState<PlanFormState>(emptyForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const loaded = useRef(false);
  useEffect(() => {
    if (profile.data && !loaded.current) {
      loaded.current = true;
      setForm(formFromProfile(profile.data));
      setSavedAt(profile.data.updated_at ?? null);
    }
  }, [profile.data]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const found = validatePlanForm(form, false);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      const saved = await api.saveProfile(toProfileUpdate(form));
      setForm(formFromProfile(saved));
      setSavedAt(saved.updated_at ?? null);
      toast.success("Saved. The generate form starts from these answers.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const user = session?.user;

  return (
    <div className="grid gap-10">
      <PageHeader
        title="Settings"
        description="Your details are saved to your account, so the generate form starts filled in on any device."
      />

      <Section title="Account">
        <dl className="grid max-w-3xl sm:grid-cols-2 sm:gap-x-10">
          {[
            ["Name", user?.name],
            ["Email", user?.email],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex items-baseline justify-between gap-4 border-b border-border py-3"
            >
              <dt className="t-label text-muted-foreground">{label}</dt>
              <dd className="min-w-0 truncate text-right text-sm font-semibold">
                {value ?? <Skeleton className="h-4 w-32" />}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section
        title="Plan defaults"
        aside={savedAt ? `Saved ${formatDateTime(savedAt)}` : "Not saved yet"}
      >
        {profile.loading ? (
          <div className="grid max-w-3xl gap-6" aria-busy="true" aria-label="Loading your details">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : profile.error ? (
          <LoadError error={profile.error} onRetry={profile.reload} what="your details" />
        ) : (
          <form onSubmit={handleSave} noValidate className="grid max-w-3xl gap-8">
            <PlanFields
              value={form}
              onChange={setForm}
              errors={errors}
              equipmentOptions={equipment.data?.equipment ?? null}
              equipmentFailed={equipment.error !== null}
            />
            <div className="border-t-2 border-foreground pt-4">
              <Button type="submit" size="lg" loading={saving} className="w-full sm:w-auto">
                <SaveIcon aria-hidden />
                Save details
              </Button>
            </div>
          </form>
        )}
      </Section>
    </div>
  );
}

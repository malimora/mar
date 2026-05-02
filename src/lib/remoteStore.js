import { isSupabaseConfigured, supabase } from "./supabase";

const profileId = import.meta.env.VITE_SUPABASE_PROFILE_ID;

export function isRemoteSyncEnabled() {
  return isSupabaseConfigured && Boolean(profileId);
}

export async function loadRemoteState() {
  if (!isRemoteSyncEnabled()) return null;

  const [{ data: settingsRow, error: settingsError }, { data: eventsRows, error: eventsError }] = await Promise.all([
    supabase.from("app_settings").select("settings").eq("profile_id", profileId).maybeSingle(),
    supabase.from("dose_events").select("*").eq("profile_id", profileId).order("actual_at", { ascending: true }),
  ]);

  if (settingsError) throw settingsError;
  if (eventsError) throw eventsError;

  return {
    settings: settingsRow?.settings,
    events: (eventsRows || []).map((row) => ({
      id: row.id,
      planId: row.plan_id,
      status: row.status,
      actualAt: row.actual_at,
      note: row.note,
      painBefore: row.pain_before,
      painAfter: row.pain_after,
      createdAt: row.created_at,
      containsTramadol: row.contains_tramadol,
    })),
  };
}

export async function saveRemoteState(state) {
  if (!isRemoteSyncEnabled()) return;

  const { error: settingsError } = await supabase.from("app_settings").upsert({
    profile_id: profileId,
    settings: state.settings,
    updated_at: new Date().toISOString(),
  });
  if (settingsError) throw settingsError;

  const { error: deleteError } = await supabase.from("dose_events").delete().eq("profile_id", profileId);
  if (deleteError) throw deleteError;

  if (Array.isArray(state.events) && state.events.length) {
    const payload = state.events.map((event) => ({
      id: event.id,
      profile_id: profileId,
      plan_id: event.planId,
      status: event.status,
      actual_at: event.actualAt,
      note: event.note,
      pain_before: event.painBefore,
      pain_after: event.painAfter,
      contains_tramadol: event.containsTramadol,
      created_at: event.createdAt,
    }));
    const { error: insertError } = await supabase.from("dose_events").insert(payload);
    if (insertError) throw insertError;
  }
}

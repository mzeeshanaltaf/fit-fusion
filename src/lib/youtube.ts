/**
 * `exercise.youtube_video_id` holds a FULL URL in the library (Shorts or youtu.be, often
 * with `?feature=share`), not an id. Never build `/embed/${value}` from it directly.
 */
export function extractYouTubeId(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    const host = u.hostname.replace(/^www\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = u.pathname.split("/")[1] ?? null;
    else if (host.endsWith("youtube.com")) {
      if (u.pathname.startsWith("/shorts/") || u.pathname.startsWith("/embed/")) {
        id = u.pathname.split("/")[2] ?? null;
      } else id = u.searchParams.get("v");
    }
    return id && /^[\w-]{6,20}$/.test(id) ? id : null;
  } catch {
    // Already a bare id?
    return /^[\w-]{11}$/.test(value) ? value : null;
  }
}

export const EVENT_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugifyEventName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function normalizeEventSlug(value: string) {
  return slugifyEventName(value);
}

export function isValidEventSlug(value: string) {
  return EVENT_SLUG_RE.test(value) && value.length >= 3 && value.length <= 60;
}

export function normalizeEventName(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 90);
}

export function normalizeOrganizerEmail(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 254) : null;
}

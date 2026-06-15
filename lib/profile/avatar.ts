export const AVATAR_BUCKET = "profile-avatars";
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export const avatarMimeExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function avatarPathFromPublicUrl(url: string | null) {
  if (!url) {
    return null;
  }

  const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
  const markerIndex = url.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  const path = url.slice(markerIndex + marker.length).split("?")[0];

  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

export function avatarPathBelongsToUser(path: string | null, userId: string) {
  const parts = path?.split("/") ?? [];
  return Boolean(path && parts[1] === userId);
}

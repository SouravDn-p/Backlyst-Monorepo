type AvatarLike = object | string | null | undefined;

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function resolveAvatarSrc(...candidates: AvatarLike[]): string | null {
  const nestedKeys = ["imageKey", "imageUrl", "url", "src", "fileUrl", "avatar", "image"];

  for (const candidate of candidates) {
    const directValue = normalizeString(candidate);
    if (directValue) {
      return directValue;
    }

    if (!candidate || typeof candidate !== "object") {
      continue;
    }

    const avatarObject = candidate as Record<string, unknown>;

    for (const key of nestedKeys) {
      const nestedValue = normalizeString(avatarObject[key]);
      if (nestedValue) {
        return nestedValue;
      }
    }
  }

  return null;
}

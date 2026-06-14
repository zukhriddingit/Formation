import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function formatDateTime(value: string | null) {
  if (!value) {
    return "Date TBA";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value?.trim())).map((value) => value.trim())),
  );
}

export function normalizeToken(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9+#.\s-]/g, "");
}

export function appUrl(path = "", requestOrigin?: string) {
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  const root = process.env.NEXT_PUBLIC_APP_URL ?? requestOrigin ?? (vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000");
  return `${root.replace(/\/$/, "")}${path}`;
}

export const locales = ["en", "km"] as const;
export type Locale = (typeof locales)[number];

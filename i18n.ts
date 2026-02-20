export const locales = ['ja', 'en', 'km'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'ja';

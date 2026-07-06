import fr from './fr';
import en from './en';

export type Lang = 'fr' | 'en';

export const dictionaries: Record<Lang, Record<string, string>> = { fr, en };

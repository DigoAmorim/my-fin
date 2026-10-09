export type IntlLocale = 'en-US' | 'pt-BR';

export function resolveIntlLocale(language: string | undefined): IntlLocale {
  return language?.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en-US';
}

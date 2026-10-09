import { enUS, ptBR } from 'date-fns/locale';
import { resolveIntlLocale } from './locale';

export function resolveDateLocales(language: string | undefined) {
  const intlLocale = resolveIntlLocale(language);

  return {
    dateFnsLocale: intlLocale === 'en-US' ? enUS : ptBR,
    intlLocale,
  };
}
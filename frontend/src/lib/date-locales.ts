import { enUS, ptBR } from 'date-fns/locale';

export function resolveDateLocales(language: string | undefined) {
  const isEnglish = language?.toLowerCase().startsWith('en') ?? false;

  return {
    dateFnsLocale: isEnglish ? enUS : ptBR,
    intlLocale: isEnglish ? 'en-US' : 'pt-BR',
  };
}
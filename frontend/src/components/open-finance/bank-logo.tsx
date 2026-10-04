import { useState } from 'react';

const BANK_DOMAINS: Array<{ aliases: string[]; domain: string }> = [
  { aliases: ['banco do brasil', 'bb'], domain: 'bb.com.br' },
  { aliases: ['itaú unibanco', 'itau unibanco', 'itaú', 'itau'], domain: 'itau.com.br' },
  { aliases: ['bradesco'], domain: 'bradesco.com.br' },
  { aliases: ['santander'], domain: 'santander.com.br' },
  { aliases: ['caixa econômica federal', 'caixa economica federal', 'caixa'], domain: 'caixa.gov.br' },
  { aliases: ['nubank', 'nu pagamentos'], domain: 'nubank.com.br' },
  { aliases: ['banco inter', 'inter'], domain: 'inter.co' },
  { aliases: ['c6 bank', 'c6'], domain: 'c6bank.com.br' },
  { aliases: ['btg pactual', 'btg'], domain: 'btgpactual.com' },
  { aliases: ['banco safra', 'safra'], domain: 'safra.com.br' },
  { aliases: ['sicredi'], domain: 'sicredi.com.br' },
  { aliases: ['sicoob'], domain: 'sicoob.com.br' },
  { aliases: ['mercado pago'], domain: 'mercadopago.com.br' },
  { aliases: ['pagbank', 'pagseguro'], domain: 'pagbank.com.br' },
  { aliases: ['picpay'], domain: 'picpay.com' },
  { aliases: ['banco neon', 'neon'], domain: 'neon.com.br' },
  { aliases: ['banrisul'], domain: 'banrisul.com.br' },
  { aliases: ['banco pan', 'pan'], domain: 'bancopan.com.br' },
  { aliases: ['brb'], domain: 'brb.com.br' },
  { aliases: ['sofisa', 'sofisa direto'], domain: 'www.sofisadireto.com.br' },
  { aliases: ['bmg'], domain: 'bancobmg.com.br' },   
  { aliases: ['xp investimentos', 'xp'], domain: 'xp.com.br' },
];

function normalizeBankName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function findBankDomain(bankName: string): string | undefined {
  const normalizedName = normalizeBankName(bankName);
  const paddedName = ` ${normalizedName} `;
  return BANK_DOMAINS.find(({ aliases }) => aliases.some((alias) => (
    paddedName.includes(` ${normalizeBankName(alias)} `)
  )))?.domain;
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const meaningfulWords = words.filter((word) => (
    !['banco', 'bank', 'do', 'da', 'de', 'of'].includes(normalizeBankName(word))
  ));
  if (meaningfulWords.length > 1) {
    return `${meaningfulWords[0][0]}${meaningfulWords[1][0]}`.toLocaleUpperCase();
  }
  if (meaningfulWords.length === 1 && words.length > 1) {
    return `${words[0][0]}${meaningfulWords[0][0]}`.toLocaleUpperCase();
  }
  return (meaningfulWords[0]?.slice(0, 2) ?? 'BK').toLocaleUpperCase();
}

type BankLogoProps = {
  bankName: string;
};

export function BankLogo({ bankName }: BankLogoProps) {
  const domain = findBankDomain(bankName);
  const [failedDomain, setFailedDomain] = useState<string | null>(null);

  if (domain && failedDomain !== domain) {
    // Bank names map to official domains; the favicon service returns their public brand icon.
    return (
      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-white p-1.5">
        <img
          src={`https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(`https://${domain}`)}&sz=128`}
          alt=""
          className="size-full object-contain"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailedDomain(domain)}
        />
      </span>
    );
  }

  return (
    <span
      className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-xs font-bold text-primary"
      aria-label={bankName}
      title={bankName}
    >
      {initials(bankName)}
    </span>
  );
}

export type CountryCode =
  | 'IN'
  | 'US'
  | 'GB'
  | 'EU'
  | 'CA'
  | 'AU'
  | 'AE'
  | 'SG'
  | 'JP'
  | 'CH'
  | 'KR'
  | 'BR';

export interface CountryCurrencySpec {
  code: CountryCode;
  countryName: string;
  currencyCode: string;
  symbol: string;
  locale: string;
  /** Exchange multiplier from base catalog USD amount */
  rateFromUsd: number;
}

export const DEFAULT_COUNTRY_CODE: CountryCode = 'IN';

export const COUNTRY_CURRENCIES: CountryCurrencySpec[] = [
  {
    code: 'IN',
    countryName: 'India',
    currencyCode: 'INR',
    symbol: '₹',
    locale: 'en-IN',
    rateFromUsd: 84,
  },
  {
    code: 'US',
    countryName: 'United States',
    currencyCode: 'USD',
    symbol: '$',
    locale: 'en-US',
    rateFromUsd: 1,
  },
  {
    code: 'GB',
    countryName: 'United Kingdom',
    currencyCode: 'GBP',
    symbol: '£',
    locale: 'en-GB',
    rateFromUsd: 0.79,
  },
  {
    code: 'EU',
    countryName: 'European Union',
    currencyCode: 'EUR',
    symbol: '€',
    locale: 'en-IE',
    rateFromUsd: 0.92,
  },
  {
    code: 'CA',
    countryName: 'Canada',
    currencyCode: 'CAD',
    symbol: 'CA$',
    locale: 'en-CA',
    rateFromUsd: 1.39,
  },
  {
    code: 'AU',
    countryName: 'Australia',
    currencyCode: 'AUD',
    symbol: 'A$',
    locale: 'en-AU',
    rateFromUsd: 1.54,
  },
  {
    code: 'AE',
    countryName: 'United Arab Emirates',
    currencyCode: 'AED',
    symbol: 'AED ',
    locale: 'en-AE',
    rateFromUsd: 3.67,
  },
  {
    code: 'SG',
    countryName: 'Singapore',
    currencyCode: 'SGD',
    symbol: 'S$',
    locale: 'en-SG',
    rateFromUsd: 1.34,
  },
  {
    code: 'JP',
    countryName: 'Japan',
    currencyCode: 'JPY',
    symbol: '¥',
    locale: 'ja-JP',
    rateFromUsd: 154,
  },
  {
    code: 'CH',
    countryName: 'Switzerland',
    currencyCode: 'CHF',
    symbol: 'CHF ',
    locale: 'de-CH',
    rateFromUsd: 0.88,
  },
  {
    code: 'KR',
    countryName: 'South Korea',
    currencyCode: 'KRW',
    symbol: '₩',
    locale: 'ko-KR',
    rateFromUsd: 1385,
  },
  {
    code: 'BR',
    countryName: 'Brazil',
    currencyCode: 'BRL',
    symbol: 'R$',
    locale: 'pt-BR',
    rateFromUsd: 5.75,
  },
];

export const COUNTRY_CURRENCY_MAP: Record<CountryCode, CountryCurrencySpec> =
  COUNTRY_CURRENCIES.reduce(
    (acc, item) => {
      acc[item.code] = item;
      return acc;
    },
    {} as Record<CountryCode, CountryCurrencySpec>
  );

export function normalizeCountryCode(raw?: string | null): CountryCode {
  if (!raw) return DEFAULT_COUNTRY_CODE;
  const upper = raw.trim().toUpperCase() as CountryCode;
  return upper in COUNTRY_CURRENCY_MAP ? upper : DEFAULT_COUNTRY_CODE;
}

export function getCountryCurrency(code?: string | null): CountryCurrencySpec {
  return COUNTRY_CURRENCY_MAP[normalizeCountryCode(code)];
}

/**
 * Converts a base USD price into the selected country's localized display amount.
 */
export function convertUsdAmount(
  usdAmount: number,
  countryCode?: CountryCode | string | null
): number {
  const spec = getCountryCurrency(countryCode);
  return Math.round(usdAmount * spec.rateFromUsd);
}

/**
 * Formats a base USD price into the user's selected country currency (defaults to India ₹ INR).
 */
export function formatCurrencyPrice(
  usdAmount: number,
  countryCode?: CountryCode | string | null,
  options?: { signed?: boolean; approx?: boolean }
): string {
  const spec = getCountryCurrency(countryCode);
  const absUsd = Math.abs(usdAmount);
  const converted = Math.round(absUsd * spec.rateFromUsd);

  let formattedNum: string;
  try {
    formattedNum = new Intl.NumberFormat(spec.locale, {
      maximumFractionDigits: 0,
    }).format(converted);
  } catch {
    formattedNum = converted.toLocaleString('en-US');
  }

  const base = `${spec.symbol}${formattedNum}`;
  const approxPrefix = options?.approx ? '~' : '';
  if (usdAmount < 0) return `-${approxPrefix}${base}`;
  if (options?.signed && usdAmount > 0) return `+${approxPrefix}${base}`;
  return `${approxPrefix}${base}`;
}

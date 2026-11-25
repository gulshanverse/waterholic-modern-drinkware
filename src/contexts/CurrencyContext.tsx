import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import {
  convertUsdAmount,
  DEFAULT_COUNTRY_CODE,
  formatCurrencyPrice,
  getCountryCurrency,
  normalizeCountryCode,
  type CountryCode,
  type CountryCurrencySpec,
} from '../utils/currency';

interface CurrencyContextValue {
  countryCode: CountryCode;
  currency: CountryCurrencySpec;
  setCountryCode: (nextCode: CountryCode) => void;
  formatPrice: (
    usdAmount: number,
    options?: { signed?: boolean; approx?: boolean }
  ) => string;
  convertPrice: (usdAmount: number) => number;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  countryCode: DEFAULT_COUNTRY_CODE,
  currency: getCountryCurrency(DEFAULT_COUNTRY_CODE),
  setCountryCode: () => {},
  formatPrice: (usdAmount, options) =>
    formatCurrencyPrice(usdAmount, DEFAULT_COUNTRY_CODE, options),
  convertPrice: (usdAmount) => convertUsdAmount(usdAmount, DEFAULT_COUNTRY_CODE),
});

interface CurrencyProviderProps {
  countryCode?: string | null;
  onChangeCountry: (nextCode: CountryCode) => void;
  children: ReactNode;
}

export function CurrencyProvider({
  countryCode,
  onChangeCountry,
  children,
}: CurrencyProviderProps) {
  const normalized = normalizeCountryCode(countryCode);
  const currency = getCountryCurrency(normalized);

  const formatPrice = useCallback(
    (usdAmount: number, options?: { signed?: boolean; approx?: boolean }) =>
      formatCurrencyPrice(usdAmount, normalized, options),
    [normalized]
  );

  const convertPrice = useCallback(
    (usdAmount: number) => convertUsdAmount(usdAmount, normalized),
    [normalized]
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({
      countryCode: normalized,
      currency,
      setCountryCode: onChangeCountry,
      formatPrice,
      convertPrice,
    }),
    [normalized, currency, onChangeCountry, formatPrice, convertPrice]
  );

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  return useContext(CurrencyContext);
}

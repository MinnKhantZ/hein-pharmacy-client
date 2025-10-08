import i18n from '../i18n';

export const formatPrice = (price: number | undefined | null): string => {
  const numPrice = Number(price) || 0;
  return `${numPrice.toFixed(0)} ${i18n.t('currency')}`;
};

export const formatPriceWithoutSymbol = (price: number | undefined | null): string => {
  const numPrice = Number(price) || 0;
  return numPrice.toFixed(0);
};

export const getCurrencySymbol = (): string => {
  return i18n.t('currency');
};
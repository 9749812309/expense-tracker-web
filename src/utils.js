export const CATEGORIES = [
  'food', 'transport', 'shopping', 'bills', 'entertainment', 'health', 'other',
];

export const CURRENCY_SYMBOLS = {
  USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥', CAD: '$', AUD: '$',
};

export function formatCurrency(amount, currency = 'USD') {
  const symbol = CURRENCY_SYMBOLS[currency] ?? '$';
  const value = Number(amount ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
  return `${symbol}${value}`;
}

export function categoryBadgeClass(category) {
  return `badge badge-${category}`;
}

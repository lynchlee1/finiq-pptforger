export const parseNumber = (value: string | number | null | undefined) => {
  if (typeof value === "number") return value;
  if (!value) return 0;
  return parseFloat(String(value).replace(/,/g, "").replace(/[^0-9.-]/g, "")) || 0;
};

export const parseInteger = (value: string | number | null | undefined) =>
  Math.floor(parseNumber(value));

export const parseKrwAmount = (value: string) => {
  const numeric = parseNumber(value);
  if (!numeric) return 0;
  if (value.includes("조")) return numeric * 1_000_000_000_000;
  if (value.includes("억")) return numeric * 100_000_000;
  return numeric * 100_000_000;
};

export const formatPercentLabel = (value: string) => {
  const parsed = parseNumber(value);
  return Number.isInteger(parsed) ? String(parsed) : String(parsed);
};

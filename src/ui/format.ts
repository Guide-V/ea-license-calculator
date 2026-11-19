export const money = (value: number, currency: string): string =>
  `${currency}${Math.round(value).toLocaleString("en-US")}`;

export const gb = (value: number): string => `${Math.round(value).toLocaleString("en-US")} GB`;

export const plural = (count: number, one: string, many = `${one}s`): string =>
  `${count} ${count === 1 ? one : many}`;

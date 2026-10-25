export const LOW_STOCK_THRESHOLD = 3;

export const inr = (paise: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: paise % 100 ? 2 : 0 }).format(paise / 100);

export const toPaise = (rupees: string) => Math.round(Number(rupees) * 100);

export const stockStatus = (q: number) =>
  q === 0 ? "Out of stock" : q <= LOW_STOCK_THRESHOLD ? "Low stock" : "In stock";

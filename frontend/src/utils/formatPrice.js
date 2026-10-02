const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatPrice(pricePaise = 0) {
  return inr.format(Number(pricePaise || 0) / 100);
}

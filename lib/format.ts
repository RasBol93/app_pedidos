export function formatCurrency(amount: number, currency = "BOB") {
  return new Intl.NumberFormat("es-BO", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(amount);
}

export function slugifyCategory(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function calculateProductPrice(product, goldPrices) {
  const goldWeight = Number(product.goldWeight);
  const karat = String(product.goldKarat);

  if (!Number.isFinite(goldWeight) || goldWeight < 0) {
    throw new Error("Invalid gold weight");
  }

  const selectedKaratPrice = Number(goldPrices[karat]);

  if (!Number.isFinite(selectedKaratPrice)) {
    throw new Error(`Gold price not found for ${karat}`);
  }

  const goldValue = goldWeight * selectedKaratPrice;

  const craftsmanship = goldValue * 0.20;
  const engraving = goldValue * 0.03;
  const packaging = goldValue * 0.03;

  const total =
    goldValue +
    craftsmanship +
    engraving +
    packaging;

  return {
    goldValue,
    craftsmanship,
    engraving,
    packaging,
    total,
  };
}
export function calculatePaymentVariants(total) {
  const price = Number(total);

  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Invalid total price");
  }

  return {
    fullPayment: price,
    halfPayment: price * 0.5,
    designFee: price * 0.2,
  };
}
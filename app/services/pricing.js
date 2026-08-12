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

  /*
   * 1. Calculate current Gold Value
   */
  const goldValue = goldWeight * selectedKaratPrice;

  /*
   * 2. Read fee percentages from product metafields
   *
   * Example:
   * craftsmanship = 20
   * personalEngravingFee = 5
   * premiumPackagingFee = 3
   *
   * These percentages represent a percentage of the FINAL
   * product price, not a percentage of gold value.
   */
  const craftsmanshipPercent = Number(product.craftsmanship || 0);

  const engravingPercent = product.personalEngraving
    ? Number(product.personalEngravingFee || 0)
    : 0;

  const packagingPercent = product.premiumPackaging
    ? Number(product.premiumPackagingFee || 0)
    : 0;

  if (
    !Number.isFinite(craftsmanshipPercent) ||
    craftsmanshipPercent < 0
  ) {
    throw new Error("Invalid craftsmanship percentage");
  }

  if (
    !Number.isFinite(engravingPercent) ||
    engravingPercent < 0
  ) {
    throw new Error("Invalid personal engraving percentage");
  }

  if (
    !Number.isFinite(packagingPercent) ||
    packagingPercent < 0
  ) {
    throw new Error("Invalid premium packaging percentage");
  }

  /*
   * 3. Calculate total fee percentage
   */
  const totalFeePercent =
    craftsmanshipPercent +
    engravingPercent +
    packagingPercent;

  /*
   * Gold must represent the remaining percentage
   * of the final product price.
   *
   * Example:
   *
   * Craftsmanship = 20%
   * Engraving = 5%
   * Packaging = 3%
   *
   * Total fees = 28%
   * Gold portion = 72%
   */
  const goldPercent = 100 - totalFeePercent;

  if (goldPercent <= 0) {
    throw new Error(
      "Total fee percentages must be less than 100%",
    );
  }

  /*
   * 4. Calculate final product price
   *
   * Example:
   *
   * Gold Value = 720
   * Gold portion = 72%
   *
   * Total = 720 / 0.72
   *       = 1000
   */
  const total = goldValue / (goldPercent / 100);

  /*
   * 5. Calculate individual fees from FINAL product price
   */
  const craftsmanship =
    total * (craftsmanshipPercent / 100);

  const engraving =
    total * (engravingPercent / 100);

  const packaging =
    total * (packagingPercent / 100);

  return {
    goldValue,
    craftsmanship,
    engraving,
    packaging,
    total,

    craftsmanshipPercent,
    engravingPercent,
    packagingPercent,
    totalFeePercent,
    goldPercent,
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
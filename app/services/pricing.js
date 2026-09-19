export function normalizeKarat(karatInput) {
  if (!karatInput && karatInput !== 0) return null;
  const str = String(karatInput).trim().toLowerCase();
  const match = str.match(/(24|22|21|20|18|14)/);
  if (match) {
    return `${match[1]}k`;
  }
  return null;
}

export function calculateProductPrice(product, goldPrices) {
  const goldWeight = Number(product.goldWeight);

  if (!Number.isFinite(goldWeight) || goldWeight < 0) {
    throw new Error("Invalid gold weight");
  }

  const rawKarat = product.goldKarat ?? product.goldPurity;
  const normalizedKarat = normalizeKarat(rawKarat);

  if (!normalizedKarat) {
    throw new Error(`Unsupported gold purity: ${rawKarat || "unknown"}`);
  }

  const selectedKaratPrice =
    Number(goldPrices[normalizedKarat]) ||
    Number(goldPrices[normalizedKarat.toUpperCase()]) ||
    Number(goldPrices[normalizedKarat.replace("k", "")]);

  if (!Number.isFinite(selectedKaratPrice) || selectedKaratPrice <= 0) {
    throw new Error(`Gold price not found for ${rawKarat}`);
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

export function calculatePhysicalVariantPrice({
  goldWeight,
  goldPurity,
  productMetafields = {},
  goldPrices,
}) {
  return calculateProductPrice(
    {
      goldWeight,
      goldKarat: goldPurity,
      craftsmanship: productMetafields.craftsmanship,
      personalEngravingFee: productMetafields.personalEngravingFee,
      premiumPackagingFee: productMetafields.premiumPackagingFee,
      personalEngraving: productMetafields.personalEngraving,
      premiumPackaging: productMetafields.premiumPackaging,
    },
    goldPrices,
  );
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

export const PAYMENT_MULTIPLIERS = {
  "Full Payment": 1.0,
  "Half Payment": 0.5,
  "Design Fee": 0.2,
};

const PAYMENT_TYPE_MAP = {
  "full payment": "Full Payment",
  "half payment": "Half Payment",
  "design fee": "Design Fee",
};

export function matchPaymentType(value) {
  if (!value || typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return PAYMENT_TYPE_MAP[normalized] || null;
}

export function parseVariantOptions(variant) {
  // 1. Structured selectedOptions (if present)
  if (Array.isArray(variant.selectedOptions) && variant.selectedOptions.length > 0) {
    let paymentType = null;
    const remainingValues = [];

    for (const opt of variant.selectedOptions) {
      const matched = matchPaymentType(opt.value);
      if (matched && !paymentType) {
        paymentType = matched;
      } else {
        remainingValues.push(opt.value);
      }
    }

    const productOptionKey =
      remainingValues.length > 0 ? remainingValues.join(" / ") : "default";

    const resolvedPaymentType = paymentType || "Full Payment";
    const paymentMultiplier = PAYMENT_MULTIPLIERS[resolvedPaymentType] ?? 1.0;

    return {
      paymentType: resolvedPaymentType,
      paymentMultiplier,
      productOptionKey,
      isPaymentRecognized: Boolean(paymentType),
    };
  }

  // 2. Fallback: Parse variant title by splitting on " / "
  const title = variant.title || "";
  const segments = title.split(" / ").map((s) => s.trim());
  let paymentType = null;
  const remainingSegments = [];

  for (const segment of segments) {
    const matched = matchPaymentType(segment);
    if (matched && !paymentType) {
      paymentType = matched;
    } else {
      remainingSegments.push(segment);
    }
  }

  const productOptionKey =
    remainingSegments.length > 0 ? remainingSegments.join(" / ") : "default";

  const resolvedPaymentType = paymentType || "Full Payment";
  const paymentMultiplier = PAYMENT_MULTIPLIERS[resolvedPaymentType] ?? 1.0;

  return {
    paymentType: resolvedPaymentType,
    paymentMultiplier,
    productOptionKey,
    isPaymentRecognized: Boolean(paymentType),
  };
}

export const USD_TO_AED = 3.6725;

export const CURRENCY_RATES = {
  USD: 1,
  AED: USD_TO_AED,
  GBP: 0.79,
  EUR: 0.86,
  SAR: 3.75,
  QAR: 3.64,
  KWD: 0.307,
  BHD: 0.376,
  OMR: 0.385,
  PKR: 280,
  INR: 87,
  CAD: 1.38,
  AUD: 1.53,
  NZD: 1.68,
  SGD: 1.29,
  JPY: 147,
  CNY: 7.18,
};

export function convertGoldPricesToCurrency(goldPrices, currency) {
  const rate = CURRENCY_RATES[currency];

  if (!rate) {
    throw new Error(
      `Unsupported Shopify store currency: ${currency}`,
    );
  }

  return Object.fromEntries(
    Object.entries(goldPrices).map(
      ([karat, price]) => [
        karat,
        Number(price) * rate,
      ],
    ),
  );
}
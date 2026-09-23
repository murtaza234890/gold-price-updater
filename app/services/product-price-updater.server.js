import {
  calculateProductPrice,
  calculatePhysicalVariantPrice,
  calculatePaymentVariants,
  parseVariantOptions,
} from "./pricing.js";

export async function updateProductVariantPrices({
  admin,
  product,
  goldPrices,
}) {
  const variants = product.variants ?? [];

  if (variants.length === 0) {
    throw new Error("Product has no variants");
  }

  // 1. Group variants by their physical variant options (excluding payment options)
  const physicalGroups = new Map();
  for (const variant of variants) {
    const parsed = parseVariantOptions(variant);
    const key = parsed.productOptionKey;

    if (!physicalGroups.has(key)) {
      physicalGroups.set(key, []);
    }
    physicalGroups.get(key).push({
      id: variant.id,
      title: variant.title,
      price: variant.price,
      paymentType: parsed.paymentType,
      paymentMultiplier: parsed.paymentMultiplier,
      productOptionKey: key,
      isPaymentRecognized: parsed.isPaymentRecognized,
      goldWeight: variant.goldWeight,
      goldPurity: variant.goldPurity,
      craftsmanship: variant.craftsmanship,
      personalEngravingFee: variant.personalEngravingFee,
      premiumPackagingFee: variant.premiumPackagingFee,
      personalEngraving: variant.personalEngraving,
      premiumPackaging: variant.premiumPackaging,
    });
  }

  // 2. Calculate physical variant prices independently
  const calculatedVariants = [];
  const physicalVariantCalculations = {};
  let primaryCalculation = null;

  for (const [key, groupVariants] of physicalGroups.entries()) {
    // Determine gold weight, purity, and fee metafields for this physical variant
    let weight = null;
    let purity = null;
    let craftsmanship = null;
    let personalEngravingFee = null;
    let premiumPackagingFee = null;
    let personalEngraving = null;
    let premiumPackaging = null;

    // Check variant-level metafields across the group
    for (const v of groupVariants) {
      const rawWeight = Number(v.goldWeight?.value ?? v.goldWeight);
      if (Number.isFinite(rawWeight) && rawWeight > 0 && weight === null) {
        weight = rawWeight;
      }
      const rawPurity = v.goldPurity?.value ?? v.goldPurity;
      if (rawPurity && purity === null) {
        purity = rawPurity;
      }
      const rawCraftsmanship = v.craftsmanship?.value ?? v.craftsmanship;
      if (
        rawCraftsmanship !== undefined &&
        rawCraftsmanship !== null &&
        rawCraftsmanship !== "" &&
        craftsmanship === null
      ) {
        craftsmanship = rawCraftsmanship;
      }
      const rawEngravingFee =
        v.personalEngravingFee?.value ?? v.personalEngravingFee;
      if (
        rawEngravingFee !== undefined &&
        rawEngravingFee !== null &&
        rawEngravingFee !== "" &&
        personalEngravingFee === null
      ) {
        personalEngravingFee = rawEngravingFee;
      }
      const rawPackagingFee =
        v.premiumPackagingFee?.value ?? v.premiumPackagingFee;
      if (
        rawPackagingFee !== undefined &&
        rawPackagingFee !== null &&
        rawPackagingFee !== "" &&
        premiumPackagingFee === null
      ) {
        premiumPackagingFee = rawPackagingFee;
      }
      const rawEngraving = v.personalEngraving?.value ?? v.personalEngraving;
      if (
        rawEngraving !== undefined &&
        rawEngraving !== null &&
        rawEngraving !== "" &&
        personalEngraving === null
      ) {
        personalEngraving = rawEngraving;
      }
      const rawPackaging = v.premiumPackaging?.value ?? v.premiumPackaging;
      if (
        rawPackaging !== undefined &&
        rawPackaging !== null &&
        rawPackaging !== "" &&
        premiumPackaging === null
      ) {
        premiumPackaging = rawPackaging;
      }
    }

    // Fallback to product-level metafields (backward compatibility)
    if (weight === null) {
      const prodWeight = Number(product.goldWeight?.value ?? product.goldWeight);
      if (Number.isFinite(prodWeight) && prodWeight > 0) {
        weight = prodWeight;
      }
    }
    if (purity === null) {
      const prodPurity =
        product.goldPurity?.value ?? product.goldPurity ?? product.goldKarat;
      if (prodPurity) {
        purity = prodPurity;
      }
    }
    if (craftsmanship === null) {
      craftsmanship = product.craftsmanship?.value ?? product.craftsmanship;
    }
    if (personalEngravingFee === null) {
      personalEngravingFee =
        product.personalEngravingFee?.value ?? product.personalEngravingFee;
    }
    if (premiumPackagingFee === null) {
      premiumPackagingFee =
        product.premiumPackagingFee?.value ?? product.premiumPackagingFee;
    }
    if (personalEngraving === null) {
      personalEngraving =
        product.personalEngraving?.value ?? product.personalEngraving;
    }
    if (premiumPackaging === null) {
      premiumPackaging =
        product.premiumPackaging?.value ?? product.premiumPackaging;
    }

    if (weight === null || purity === null) {
      const missingField =
        weight === null && purity === null
          ? "gold_weight and gold_purity"
          : weight === null
            ? "gold_weight"
            : "gold_purity";
      const variantDesc = key === "default" ? "product" : `'${key}'`;
      throw new Error(
        `Missing ${missingField} on physical variant ${variantDesc}`,
      );
    }

    // Calculate physical variant base price
    const calculation = calculatePhysicalVariantPrice({
      goldWeight: weight,
      goldPurity: purity,
      craftsmanship,
      personalEngravingFee,
      premiumPackagingFee,
      personalEngraving,
      premiumPackaging,
      productMetafields: product,
      goldPrices,
    });

    physicalVariantCalculations[key] = {
      weight,
      purity,
      craftsmanship,
      personalEngravingFee,
      premiumPackagingFee,
      calculation,
    };

    if (!primaryCalculation) {
      primaryCalculation = calculation;
    }

    const basePrice = calculation.total;

    // Calculate payment variants for this physical variant
    for (const v of groupVariants) {
      const finalPrice = basePrice * v.paymentMultiplier;
      calculatedVariants.push({
        id: v.id,
        title: v.title,
        basePrice,
        paymentType: v.paymentType,
        paymentMultiplier: v.paymentMultiplier,
        finalPrice,
        finalPriceFormatted: finalPrice.toFixed(2),
      });
    }
  }

  // 3. Debug logging (Render logs format)
  console.log(`\nPRODUCT: ${product.title || "Unknown"}\n`);
  for (const item of calculatedVariants) {
    console.log("VARIANT:");
    console.log(item.title);
    console.log(`Base Price: ${item.basePrice.toFixed(2)}`);
    console.log(`Payment Type: ${item.paymentType}`);
    console.log(`Payment Multiplier: ${item.paymentMultiplier}`);
    console.log(`Final Price: ${item.finalPriceFormatted}\n`);
  }

  // 4. Send bulk update to Shopify
  const updates = calculatedVariants.map((item) => ({
    id: item.id,
    price: item.finalPriceFormatted,
  }));

  const response = await admin.graphql(
    `#graphql
      mutation ProductVariantsBulkUpdate(
        $productId: ID!
        $variants: [ProductVariantsBulkInput!]!
      ) {
        productVariantsBulkUpdate(
          productId: $productId
          variants: $variants
        ) {
          productVariants {
            id
            title
            price
          }
          userErrors {
            field
            message
          }
        }
      }
    `,
    {
      variables: {
        productId: product.id,
        variants: updates,
      },
    },
  );

  const result = await response.json();

  const payload = result.data?.productVariantsBulkUpdate;

  if (!payload) {
    throw new Error("Shopify did not return a bulk update response");
  }

  if (payload.userErrors.length > 0) {
    throw new Error(
      payload.userErrors
        .map((error) => error.message)
        .join(", "),
    );
  }

  return {
    calculation: primaryCalculation,
    physicalVariantCalculations,
    payments: calculatePaymentVariants(primaryCalculation.total),
    updatedVariants: payload.productVariants,
  };
}
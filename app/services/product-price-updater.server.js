import {
  calculateProductPrice,
  calculatePaymentVariants,
} from "./pricing.js";

export async function updateProductVariantPrices({
  admin,
  product,
  goldPrices,
}) {
  const calculation = calculateProductPrice(product, goldPrices);

  const payments = calculatePaymentVariants(calculation.total);

  const priceByVariantName = {
    "Full Payment": payments.fullPayment,
    "Half Payment": payments.halfPayment,
    "Design Fee": payments.designFee,
  };

  const variants = product.variants ?? [];

  if (variants.length === 0) {
    throw new Error("Product has no variants");
  }

  // Variant title examples:
  // "47 / Full Payment"
  // "47 / Half Payment"
  // "47 / Design Fee"
  //
  // The ring size (47, 48, etc.) remains part of the
  // Shopify variant. We only use the payment option
  // to determine its price.

  const updates = variants
    .map((variant) => {
      const paymentType = variant.title.split(" / ").pop();

      const price = priceByVariantName[paymentType];

      if (price === undefined) {
        return null;
      }

      return {
        id: variant.id,
        price: price.toFixed(2),
      };
    })
    .filter(Boolean);

  if (updates.length === 0) {
    throw new Error(
      "No matching payment variants found. Expected variants ending with: Full Payment, Half Payment, Design Fee",
    );
  }

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
    calculation,
    payments,
    updatedVariants: payload.productVariants,
  };
}
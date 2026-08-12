import { getGoldPrices } from "./gold.server";
import { updateProductVariantPrices } from "./product-price-updater.server";

const PRODUCTS_QUERY = `#graphql
  query GetProductsForPriceUpdate($cursor: String) {
    products(first: 100, after: $cursor) {
      nodes {
        id
        title

        goldWeight: metafield(
          namespace: "custom"
          key: "gold_weight"
        ) {
          value
        }

        goldPurity: metafield(
          namespace: "custom"
          key: "gold_purity"
        ) {
          value
        }

        craftsmanship: metafield(
          namespace: "custom"
          key: "craftsmanship"
        ) {
          value
        }

        personalEngravingFee: metafield(
          namespace: "custom"
          key: "personal_engraving_fee"
        ) {
          value
        }

        premiumPackagingFee: metafield(
          namespace: "custom"
          key: "premium_packaging_fee"
        ) {
          value
        }

        personalEngraving: metafield(
          namespace: "custom"
          key: "personal_engraving"
        ) {
          value
        }

        premiumPackaging: metafield(
          namespace: "custom"
          key: "premium_packaging"
        ) {
          value
        }

        variants(first: 100) {
          nodes {
            id
            title
            price
          }
        }
      }

      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export async function updateAllProductPrices({ admin }) {
  const goldPrices = await getGoldPrices();

  let cursor = null;
  let processedProducts = 0;
  let updatedProducts = 0;
  let skippedProducts = 0;

  const results = [];

  do {
    const response = await admin.graphql(PRODUCTS_QUERY, {
      variables: {
        cursor,
      },
    });

    const result = await response.json();

    if (result.errors) {
      throw new Error(
        result.errors.map((error) => error.message).join(", "),
      );
    }

    const products = result.data?.products;

    if (!products) {
      throw new Error("Shopify did not return products");
    }

    for (const product of products.nodes) {
      processedProducts++;

      if (
        !product.goldWeight?.value ||
        !product.goldPurity?.value
      ) {
        skippedProducts++;

        results.push({
          product: product.title,
          status: "skipped",
          reason: "Missing gold_weight or gold_purity",
        });

        continue;
      }

      try {
        const productForCalculation = {
          id: product.id,

          goldWeight: Number(
            product.goldWeight.value,
          ),

          goldKarat: product.goldPurity.value,

          craftsmanship: Number(
            product.craftsmanship?.value || 0,
          ),

          personalEngravingFee: Number(
            product.personalEngravingFee?.value || 0,
          ),

          premiumPackagingFee: Number(
            product.premiumPackagingFee?.value || 0,
          ),

          personalEngraving:
            product.personalEngraving?.value === "true",

          premiumPackaging:
            product.premiumPackaging?.value === "true",

          variants: product.variants.nodes,
        };

        console.log(
          "PRODUCT FOR CALCULATION:",
          JSON.stringify(
            productForCalculation,
            null,
            2,
          ),
        );

        const updateResult =
          await updateProductVariantPrices({
            admin,
            product: productForCalculation,
            goldPrices,
          });

        updatedProducts++;

        results.push({
          product: product.title,
          status: "updated",
          calculation: updateResult.calculation,
          payments: updateResult.payments,
          updatedVariants:
            updateResult.updatedVariants,
        });
      } catch (error) {
        results.push({
          product: product.title,
          status: "error",
          reason:
            error instanceof Error
              ? error.message
              : "Unknown error",
        });
      }
    }

    cursor = products.pageInfo.hasNextPage
      ? products.pageInfo.endCursor
      : null;
  } while (cursor);

  return {
    success: true,
    goldPrices,
    processedProducts,
    updatedProducts,
    skippedProducts,
    results,
  };
}
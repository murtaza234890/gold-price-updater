import {
  getGoldPrices,
  saveGoldPrices,
} from "./gold.server";

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
  /*
   * IMPORTANT:
   *
   * GoldAPI is called ONLY ONCE here.
   *
   * The same goldPrices object is then used
   * for every product.
   */
  const goldPrices = await getGoldPrices();

  /*
   * Save the latest successful GoldAPI prices
   * into PostgreSQL.
   *
   * The storefront widget will later read
   * these saved prices instead of calling GoldAPI.
   */
  await saveGoldPrices(goldPrices);

  console.log(
    "LATEST GOLD PRICES SAVED:",
    JSON.stringify(goldPrices, null, 2),
  );

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
        result.errors
          .map((error) => error.message)
          .join(", "),
      );
    }

    const products = result.data?.products;

    if (!products) {
      throw new Error(
        "Shopify did not return products",
      );
    }

    for (const product of products.nodes) {
      processedProducts++;

      /*
       * Product must have both:
       *
       * gold_weight
       * gold_purity
       */
      if (
        !product.goldWeight?.value ||
        !product.goldPurity?.value
      ) {
        skippedProducts++;

        results.push({
          product: product.title,
          status: "skipped",
          reason:
            "Missing gold_weight or gold_purity",
        });

        continue;
      }

      try {
        /*
         * Prepare product data for pricing calculation.
         */
        const productForCalculation = {
          id: product.id,

          goldWeight: Number(
            product.goldWeight.value,
          ),

          goldKarat:
            product.goldPurity.value,

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
            product.personalEngraving?.value ===
            "true",

          premiumPackaging:
            product.premiumPackaging?.value ===
            "true",

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

        /*
         * Calculate and update this product
         * using the SAME goldPrices fetched
         * at the beginning of this function.
         */
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

          calculation:
            updateResult.calculation,

          payments:
            updateResult.payments,

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

    /*
     * Move to the next Shopify products page.
     */
    cursor = products.pageInfo.hasNextPage
      ? products.pageInfo.endCursor
      : null;
  } while (cursor);

  return {
    success: true,

    /*
     * Return the exact gold prices that were
     * fetched from GoldAPI and saved to DB.
     */
    goldPrices,

    processedProducts,
    updatedProducts,
    skippedProducts,

    results,
  };
}
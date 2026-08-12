import {
  getGoldPrices,
  saveGoldPrices,
} from "./gold.server";

import { updateProductVariantPrices } from "./product-price-updater.server";

const USD_TO_AED = 3.6725;

const CURRENCY_RATES = {
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

const SHOP_CURRENCY_QUERY = `#graphql
  query GetShopCurrency {
    shop {
      currencyCode
    }
  }
`;

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

function convertGoldPricesToCurrency(goldPrices, currency) {
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

export async function updateAllProductPrices({ admin }) {
  /*
   * ---------------------------------------------------------
   * 1. Get Shopify store base currency
   * ---------------------------------------------------------
   *
   * Example:
   *
   * USD
   * AED
   * GBP
   * EUR
   *
   * Product prices in Shopify are calculated using
   * this store currency.
   */

  const shopResponse = await admin.graphql(
    SHOP_CURRENCY_QUERY,
  );

  const shopResult = await shopResponse.json();

  if (shopResult.errors) {
    throw new Error(
      shopResult.errors
        .map((error) => error.message)
        .join(", "),
    );
  }

  const storeCurrency =
    shopResult.data?.shop?.currencyCode;

  if (!storeCurrency) {
    throw new Error(
      "Shopify store currency could not be determined",
    );
  }

  console.log(
    "SHOPIFY STORE CURRENCY:",
    storeCurrency,
  );

  /*
   * ---------------------------------------------------------
   * 2. Get fresh gold price from GoldAPI
   * ---------------------------------------------------------
   *
   * GoldAPI is called ONLY ONCE per update.
   */

  const goldPricesUSD = await getGoldPrices();

  console.log(
    "GOLD PRICES FROM GOLDAPI (USD):",
    JSON.stringify(
      goldPricesUSD,
      null,
      2,
    ),
  );

  /*
   * ---------------------------------------------------------
   * 3. Save original USD prices to database
   * ---------------------------------------------------------
   *
   * The widget API will later read these saved USD prices
   * and convert them according to the requested currency.
   *
   * IMPORTANT:
   * Database continues to store the original GoldAPI USD
   * prices.
   */

  await saveGoldPrices(goldPricesUSD);

  /*
   * ---------------------------------------------------------
   * 4. Convert gold prices into Shopify store currency
   * ---------------------------------------------------------
   *
   * Example:
   *
   * GoldAPI:
   * 18K = $106.51/g
   *
   * AED store:
   * 106.51 × 3.6725
   *
   * = AED 391.23/g
   *
   * The same converted value is now used for product
   * calculations.
   */

  const goldPrices = convertGoldPricesToCurrency(
    goldPricesUSD,
    storeCurrency,
  );

  console.log(
    `GOLD PRICES USED FOR ${storeCurrency}:`,
    JSON.stringify(
      goldPrices,
      null,
      2,
    ),
  );

  /*
   * ---------------------------------------------------------
   * 5. Process ALL Shopify products
   * ---------------------------------------------------------
   */

  let cursor = null;

  let processedProducts = 0;
  let updatedProducts = 0;
  let skippedProducts = 0;
  let errorProducts = 0;

  const results = [];

  do {
    console.log(
      "FETCHING PRODUCTS PAGE:",
      cursor || "FIRST PAGE",
    );

    const response = await admin.graphql(
      PRODUCTS_QUERY,
      {
        variables: {
          cursor,
        },
      },
    );

    const result = await response.json();

    if (result.errors) {
      throw new Error(
        result.errors
          .map((error) => error.message)
          .join(", "),
      );
    }

    const products =
      result.data?.products;

    if (!products) {
      throw new Error(
        "Shopify did not return products",
      );
    }

    console.log(
      `PRODUCTS IN CURRENT PAGE: ${products.nodes.length}`,
    );

    /*
     * -------------------------------------------------------
     * Process every product in this page
     * -------------------------------------------------------
     */

    for (const product of products.nodes) {
      processedProducts++;

      console.log(
        `PROCESSING PRODUCT ${processedProducts}: ${product.title}`,
      );

      /*
       * Product requires gold weight and purity.
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

        console.log(
          `SKIPPED: ${product.title} - missing gold_weight or gold_purity`,
        );

        continue;
      }

      try {
        /*
         * Prepare product data for pricing.
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

          variants:
            product.variants?.nodes || [],
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
         * IMPORTANT:
         *
         * goldPrices here are already converted
         * into Shopify's store currency.
         *
         * Therefore pricing.js calculates everything
         * in the same currency as Shopify product prices.
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

        console.log(
          `UPDATED: ${product.title}`,
        );
      } catch (error) {
        errorProducts++;

        const errorMessage =
          error instanceof Error
            ? error.message
            : "Unknown error";

        results.push({
          product: product.title,
          status: "error",
          reason: errorMessage,
        });

        console.error(
          `ERROR UPDATING ${product.title}:`,
          error,
        );
      }
    }

    /*
     * -------------------------------------------------------
     * Move to next page
     * -------------------------------------------------------
     */

    cursor =
      products.pageInfo.hasNextPage
        ? products.pageInfo.endCursor
        : null;

    console.log(
      "NEXT CURSOR:",
      cursor,
    );
  } while (cursor);

  /*
   * ---------------------------------------------------------
   * 6. Final result
   * ---------------------------------------------------------
   */

  console.log(
    "========================================",
  );

  console.log(
    "GOLD PRICE UPDATE COMPLETED",
  );

  console.log(
    "Store Currency:",
    storeCurrency,
  );

  console.log(
    "Processed Products:",
    processedProducts,
  );

  console.log(
    "Updated Products:",
    updatedProducts,
  );

  console.log(
    "Skipped Products:",
    skippedProducts,
  );

  console.log(
    "Error Products:",
    errorProducts,
  );

  console.log(
    "========================================",
  );

  return {
    success: true,

    currency: storeCurrency,

    /*
     * These are the prices actually used
     * for Shopify product calculations.
     */
    goldPrices,

    /*
     * Original GoldAPI prices.
     */
    goldPricesUSD,

    processedProducts,
    updatedProducts,
    skippedProducts,
    errorProducts,

    results,
  };
}
import { authenticate } from "../shopify.server";
import { getLatestGoldPrices } from "../services/gold.server";

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

export async function loader({ request }) {
  try {
    const { admin } = await authenticate.admin(request);

    /*
     * Get the store's actual Shopify currency.
     *
     * Example:
     * USD store -> USD
     * UAE store  -> AED
     */
    const response = await admin.graphql(
      SHOP_CURRENCY_QUERY,
    );

    const result = await response.json();

    if (result.errors) {
      throw new Error(
        result.errors
          .map((error) => error.message)
          .join(", "),
      );
    }

    const currency =
      result.data?.shop?.currencyCode;

    if (!currency) {
      throw new Error(
        "Shopify store currency could not be determined",
      );
    }

    const rate = CURRENCY_RATES[currency];

    if (rate === undefined) {
      return Response.json(
        {
          success: false,
          error: `Currency ${currency} is not supported yet`,
        },
        { status: 400 },
      );
    }

    /*
     * Read the latest saved gold prices from PostgreSQL.
     *
     * This does NOT call GoldAPI.
     *
     * GoldAPI is called only when
     * Update All Products is executed.
     */
    const savedGoldPrices =
      await getLatestGoldPrices();

    /*
     * Saved gold prices are stored in USD.
     *
     * Convert them into the Shopify store currency.
     */
    const prices = Object.fromEntries(
      Object.entries(savedGoldPrices)
        .filter(([key]) => key !== "updatedAt")
        .map(([karat, price]) => [
          karat,
          Number(price) * rate,
        ]),
    );

    return Response.json({
      success: true,

      /*
       * Currency automatically comes from Shopify.
       */
      currency,

      /*
       * Keep the property name consistent
       * with GoldPrices.jsx.
       */
      goldPrices: prices,

      updatedAt:
        savedGoldPrices.updatedAt,
    });
  } catch (error) {
    console.error(
      "Gold price API error:",
      error,
    );

    return Response.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}
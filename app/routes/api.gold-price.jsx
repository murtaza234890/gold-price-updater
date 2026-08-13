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

export async function loader({ request }) {
  try {
    const url = new URL(request.url);

    /*
     * Default currency is AED.
     *
     * This keeps the existing API compatible with
     * the storefront widget while making the admin
     * Gold Prices page show AED by default.
     *
     * A different supported currency can still be
     * requested with ?currency=USD etc.
     */
    const currency = (
      url.searchParams.get("currency") || "AED"
    ).toUpperCase();

    const rate = CURRENCY_RATES[currency];

    if (rate === undefined) {
      return Response.json(
        {
          success: false,
          error: `Unsupported currency: ${currency}`,
        },
        { status: 400 },
      );
    }

    /*
     * Read the latest saved gold prices from PostgreSQL.
     *
     * IMPORTANT:
     * This does NOT call GoldAPI.
     *
     * GoldAPI is only called when
     * Update All Products is executed.
     */
    const savedGoldPrices =
      await getLatestGoldPrices();

    /*
     * Saved prices are stored in USD.
     *
     * Convert them to the requested currency.
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
       * Currency used for these prices.
       */
      currency,

      /*
       * Keep `prices` because the storefront
       * widget already uses this property.
       *
       * DO NOT remove it.
       */
      prices,

      /*
       * Also provide `goldPrices` for the
       * admin Gold Prices page.
       */
      goldPrices: prices,

      updatedAt: savedGoldPrices.updatedAt,
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
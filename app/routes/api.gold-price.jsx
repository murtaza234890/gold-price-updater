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

    const currency = (
      url.searchParams.get("currency") || "USD"
    ).toUpperCase();

    const rate = CURRENCY_RATES[currency];

    if (!rate) {
      return Response.json(
        {
          success: false,
          error: `Unsupported currency: ${currency}`,
        },
        { status: 400 },
      );
    }

    /*
     * IMPORTANT:
     *
     * Read the latest gold prices from PostgreSQL.
     *
     * This function DOES NOT call GoldAPI.
     *
     * GoldAPI is only called when
     * Update All Products is executed.
     */
    const savedGoldPrices =
      await getLatestGoldPrices();

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
      currency,
      prices,
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
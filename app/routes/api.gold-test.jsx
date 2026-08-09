import { getGoldPrices } from "../services/gold.server";

export async function loader() {
  try {
    const prices = await getGoldPrices();

    return Response.json({
      success: true,
      prices,
    });
  } catch (error) {
    console.error("Gold API error:", error);

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
import { authenticate } from "../shopify.server";
import { updateAllProductPrices } from "../services/all-products-price-updater.server";

export async function action({ request }) {
  try {
    const { admin } = await authenticate.admin(request);

    const result = await updateAllProductPrices({
      admin,
    });

    return Response.json(result);
  } catch (error) {
    console.error("All products price update error:", error);

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function loader() {
  return Response.json({
    message: "Use POST to update all product prices",
  });
}
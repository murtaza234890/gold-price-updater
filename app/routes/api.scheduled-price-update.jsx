import { unauthenticated } from "../shopify.server";
import { updateAllProductPrices } from "../services/all-products-price-updater.server";

export async function loader({ request }) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const shopDomain = process.env.SHOP_DOMAIN;

    if (!cronSecret) {
      console.error("CRON_SECRET is missing");

      return Response.json(
        {
          success: false,
          error: "CRON_SECRET is not configured",
        },
        { status: 500 },
      );
    }

    if (!shopDomain) {
      console.error("SHOP_DOMAIN is missing");

      return Response.json(
        {
          success: false,
          error: "SHOP_DOMAIN is not configured",
        },
        { status: 500 },
      );
    }

    const authorization =
      request.headers.get("authorization");

    if (
      authorization !==
      `Bearer ${cronSecret}`
    ) {
      return Response.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    console.log(
      `Starting automatic gold price update for ${shopDomain}`,
    );

    const { admin } =
      await unauthenticated.admin(shopDomain);

    const result =
      await updateAllProductPrices({
        admin,
      });

    console.log(
      "Automatic gold price update completed:",
      {
        processedProducts:
          result.processedProducts,

        updatedProducts:
          result.updatedProducts,

        skippedProducts:
          result.skippedProducts,
      },
    );

    return Response.json({
      success: true,
      message:
        "Automatic gold price update completed",

      ...result,
    });
  } catch (error) {
    console.error(
      "Automatic gold price update error:",
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
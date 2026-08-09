import { authenticate } from "../shopify.server";
import { getGoldPrices } from "../services/gold.server";
import { updateProductVariantPrices } from "../services/product-price-updater.server";

export async function action({ request }) {
  try {
    const { admin } = await authenticate.admin(request);

    const body = await request.json();
    const productId = body.productId;

    if (!productId) {
      return Response.json(
        {
          success: false,
          error: "productId is required",
        },
        { status: 400 },
      );
    }

    const response = await admin.graphql(
      `#graphql
        query GetProductForPriceUpdate($id: ID!) {
          product(id: $id) {
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

            variants(first: 100) {
              nodes {
                id
                title
                price
              }
            }
          }
        }
      `,
      {
        variables: {
          id: productId,
        },
      },
    );

    const result = await response.json();

    if (result.errors) {
      throw new Error(
        result.errors.map((error) => error.message).join(", "),
      );
    }

    const product = result.data?.product;

    if (!product) {
      return Response.json(
        {
          success: false,
          error: "Product not found",
        },
        { status: 404 },
      );
    }

    if (!product.goldWeight?.value) {
      throw new Error("custom.gold_weight metafield is missing");
    }

    if (!product.goldPurity?.value) {
      throw new Error("custom.gold_purity metafield is missing");
    }

    const goldPrices = await getGoldPrices();

    const productForCalculation = {
      id: product.id,
      goldWeight: Number(product.goldWeight.value),
      goldKarat: product.goldPurity.value,
      variants: product.variants.nodes,
    };
console.log(
  "SHOPIFY VARIANTS:",
  JSON.stringify(product.variants.nodes, null, 2),
);
    const updateResult = await updateProductVariantPrices({
      admin,
      product: productForCalculation,
      goldPrices,
    });

    return Response.json({
      success: true,
      product: product.title,
      goldPrices,
      ...updateResult,
    });
  } catch (error) {
    console.error("Product price update error:", error);

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
export async function loader() {
  return Response.json({
    message: "Use POST to update product prices",
    productId: "9589624996084",
  });
}
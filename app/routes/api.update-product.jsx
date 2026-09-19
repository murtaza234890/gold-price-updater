import { authenticate } from "../shopify.server";
import { getGoldPrices } from "../services/gold.server";
import { convertGoldPricesToCurrency } from "../services/pricing.js";
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
                selectedOptions {
                  name
                  value
                }
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
              }
            }
          }
          shop {
            currencyCode
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

    const variantsNodes = product.variants?.nodes || [];
    const hasVariantGoldData = variantsNodes.some(
      (v) => v.goldWeight?.value && v.goldPurity?.value,
    );
    const hasProductGoldData = Boolean(
      product.goldWeight?.value && product.goldPurity?.value,
    );

    if (!hasVariantGoldData && !hasProductGoldData) {
      throw new Error(
        "Missing gold_weight or gold_purity (neither variant-level nor product-level data found)",
      );
    }

    const storeCurrency = result.data?.shop?.currencyCode || "AED";
    const goldPricesUSD = await getGoldPrices();
    const goldPrices = convertGoldPricesToCurrency(goldPricesUSD, storeCurrency);

    const productForCalculation = {
      id: product.id,
      title: product.title,

      goldWeight: product.goldWeight?.value
        ? Number(product.goldWeight.value)
        : null,

      goldKarat: product.goldPurity?.value || null,

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

      variants: variantsNodes,
    };

    console.log(
      "PRODUCT FOR CALCULATION:",
      JSON.stringify(productForCalculation, null, 2),
    );

    console.log(
      "SHOPIFY VARIANTS:",
      JSON.stringify(variantsNodes, null, 2),
    );

    const updateResult = await updateProductVariantPrices({
      admin,
      product: productForCalculation,
      goldPrices,
    });

    return Response.json({
      success: true,
      product: product.title,
      currency: storeCurrency,
      goldPrices,
      ...updateResult,
    });
  } catch (error) {
    console.error("Product price update error:", error);

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

export async function loader() {
  return Response.json({
    message: "Use POST to update product prices",
    productId: "9589624996084",
  });
}
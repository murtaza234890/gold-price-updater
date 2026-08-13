import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(`
    #graphql
    query GetProducts {
      products(first: 50) {
        nodes {
          id
          title
          status
          variants(first: 100) {
            nodes {
              id
              title
              price
            }
          }
        }
      }
    }
  `);

  const result = await response.json();

  if (result.errors) {
    throw new Error(
      result.errors.map((error) => error.message).join(", "),
    );
  }

  return {
    products: result.data?.products?.nodes ?? [],
  };
}

export default function Products() {
  const { products } = useLoaderData();

  const totalProducts = products.length;

  const activeProducts = products.filter(
    (product) => product.status === "ACTIVE",
  ).length;

  const totalVariants = products.reduce(
    (total, product) =>
      total + (product.variants?.nodes?.length ?? 0),
    0,
  );

  return (
    <s-page heading="Products">
      {/* Summary */}
      <s-section heading="Product Overview">
        <s-stack direction="inline" gap="base">

          <s-box
            padding="base"
            border="base"
            borderRadius="base"
          >
            <s-stack direction="block" gap="small">
              <s-text>Total Products</s-text>
              <s-heading>{totalProducts}</s-heading>
            </s-stack>
          </s-box>

          <s-box
            padding="base"
            border="base"
            borderRadius="base"
          >
            <s-stack direction="block" gap="small">
              <s-text>Active Products</s-text>
              <s-heading>{activeProducts}</s-heading>
            </s-stack>
          </s-box>

          <s-box
            padding="base"
            border="base"
            borderRadius="base"
          >
            <s-stack direction="block" gap="small">
              <s-text>Total Variants</s-text>
              <s-heading>{totalVariants}</s-heading>
            </s-stack>
          </s-box>

        </s-stack>
      </s-section>

      {/* Products */}
      <s-section heading="Gold Products">
        <s-stack direction="block" gap="base">

          <s-paragraph>
            Products and their current Shopify variant prices.
          </s-paragraph>

          {products.length === 0 ? (
            <s-banner tone="info">
              No products found.
            </s-banner>
          ) : (
            products.map((product) => (
              <s-box
                key={product.id}
                padding="base"
                border="base"
                borderRadius="base"
              >
                <s-stack direction="block" gap="base">

                  {/* Product header */}
                  <s-stack
                    direction="inline"
                    justifyContent="space-between"
                    gap="base"
                  >
                    <s-stack direction="block" gap="small">
                      <s-heading>{product.title}</s-heading>

                      <s-text>
                        Status: {product.status}
                      </s-text>
                    </s-stack>

                    <s-badge
                      tone={
                        product.status === "ACTIVE"
                          ? "success"
                          : "neutral"
                      }
                    >
                      {product.status}
                    </s-badge>
                  </s-stack>

                  {/* Variants */}
                  {product.variants?.nodes?.length > 0 ? (
                    <s-stack direction="block" gap="small">

                      <s-text>
                        <strong>Variants & Prices</strong>
                      </s-text>

                      {product.variants.nodes.map((variant) => (
                        <s-box
                          key={variant.id}
                          padding="small"
                          background="subdued"
                          borderRadius="base"
                        >
                          <s-stack
                            direction="inline"
                            justifyContent="space-between"
                            gap="base"
                          >
                            <s-text>
                              {variant.title}
                            </s-text>

                            <s-text>
                              {Number(variant.price).toFixed(2)}
                            </s-text>
                          </s-stack>
                        </s-box>
                      ))}

                    </s-stack>
                  ) : (
                    <s-text>
                      No variants found.
                    </s-text>
                  )}

                </s-stack>
              </s-box>
            ))
          )}

        </s-stack>
      </s-section>
    </s-page>
  );
}
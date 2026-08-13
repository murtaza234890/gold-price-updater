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

  return (
    <s-page heading="Products">
      <s-section heading="Gold Products">
        <s-stack direction="block" gap="base">

          <s-paragraph>
            Products and their current Shopify variant prices.
          </s-paragraph>

          {products.length === 0 ? (
            <s-paragraph>
              No products found.
            </s-paragraph>
          ) : (
            products.map((product) => (
              <s-section
                key={product.id}
                heading={product.title}
              >
                <s-paragraph>
                  Status: {product.status}
                </s-paragraph>

                {product.variants.nodes.map((variant) => (
                  <s-paragraph key={variant.id}>
                    {variant.title}: {variant.price}
                  </s-paragraph>
                ))}
              </s-section>
            ))
          )}

        </s-stack>
      </s-section>
    </s-page>
  );
}
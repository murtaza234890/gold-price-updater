import { useEffect } from "react";
import { useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function Index() {
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const isLoading =
    ["loading", "submitting"].includes(fetcher.state) &&
    fetcher.formMethod === "POST";

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show(
        `Updated ${fetcher.data.updatedProducts ?? 0} products`,
      );
    }

    if (fetcher.data?.success === false) {
      shopify.toast.show(
        fetcher.data.error || "Price update failed",
      );
    }
  }, [fetcher.data, shopify]);

  const updateAllPrices = () => {
    fetcher.submit(
      {},
      {
        method: "POST",
        action: "/api/update-all-products",
        encType: "application/json",
      },
    );
  };

  return (
    <s-page heading="Gold Price Updater">
      <s-section heading="Update All Product Prices">
        <s-paragraph>
          This will fetch the latest gold prices and update all eligible
          Shopify product variants automatically.
        </s-paragraph>

        <s-button
          onClick={updateAllPrices}
          {...(isLoading ? { loading: true } : {})}
        >
          Update All Product Prices
        </s-button>
      </s-section>

      {fetcher.data?.success && (
        <s-section heading="Update Result">
          <s-stack direction="block" gap="base">

            <s-paragraph>
              Products found:{" "}
              {fetcher.data.processedProducts ?? 0}
            </s-paragraph>

            <s-paragraph>
              Products updated:{" "}
              {fetcher.data.updatedProducts ?? 0}
            </s-paragraph>

            <s-paragraph>
              Products skipped:{" "}
              {fetcher.data.skippedProducts ?? 0}
            </s-paragraph>

            <s-paragraph>
              Products with errors:{" "}
              {fetcher.data.errorProducts ?? 0}
            </s-paragraph>

            {fetcher.data.currency && (
              <s-paragraph>
                Store currency: {fetcher.data.currency}
              </s-paragraph>
            )}

            {fetcher.data.results?.map((product, index) => (
              <s-section
                key={`${product.product}-${index}`}
                heading={product.product || "Product"}
              >
                <s-paragraph>
                  Status: {product.status}
                </s-paragraph>

                {product.reason && (
                  <s-paragraph>
                    Reason: {product.reason}
                  </s-paragraph>
                )}

                {product.updatedVariants?.map((variant) => (
                  <s-paragraph key={variant.id}>
                    {variant.title}: {variant.price}
                  </s-paragraph>
                ))}
              </s-section>
            ))}

          </s-stack>
        </s-section>
      )}

      {fetcher.data?.success === false && (
        <s-section heading="Error">
          <s-paragraph>
            {fetcher.data.error}
          </s-paragraph>
        </s-section>
      )}
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
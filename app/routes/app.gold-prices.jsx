import { useEffect } from "react";
import { useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function GoldPrices() {
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  const isLoading =
    ["loading", "submitting"].includes(fetcher.state) &&
    fetcher.formMethod === "GET";

  useEffect(() => {
    if (fetcher.data?.success === false) {
      shopify.toast.show(
        fetcher.data.error || "Failed to load gold prices",
      );
    }
  }, [fetcher.data, shopify]);

  const loadGoldPrices = () => {
    fetcher.load("/api/gold-price");
  };

  const goldPrices = fetcher.data?.goldPrices;

  return (
    <s-page heading="Gold Prices">
      <s-section heading="Current Gold Prices">
        <s-paragraph>
          View the latest saved gold prices used by the product price
          calculator.
        </s-paragraph>

        <s-button
          onClick={loadGoldPrices}
          {...(isLoading ? { loading: true } : {})}
        >
          Refresh Gold Prices
        </s-button>
      </s-section>

      {fetcher.data?.success && goldPrices && (
        <s-section heading="Latest Prices">
          <s-stack direction="block" gap="base">

            {Object.entries(goldPrices).map(([karat, price]) => (
              <s-paragraph key={karat}>
                <strong>{karat}</strong>: {price}
              </s-paragraph>
            ))}

            {fetcher.data.currency && (
              <s-paragraph>
                Currency: {fetcher.data.currency}
              </s-paragraph>
            )}

            {fetcher.data.updatedAt && (
              <s-paragraph>
                Last updated: {fetcher.data.updatedAt}
              </s-paragraph>
            )}

          </s-stack>
        </s-section>
      )}

      {!fetcher.data && (
        <s-section heading="Gold Prices">
          <s-paragraph>
            Click "Refresh Gold Prices" to load the latest saved prices.
          </s-paragraph>
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
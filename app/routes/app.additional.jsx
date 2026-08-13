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
    fetcher.state === "loading" &&
    fetcher.formMethod === "GET";

  const loadGoldPrices = () => {
    fetcher.load("/api/gold-price");
  };

  // Automatically load saved gold prices when page opens
  useEffect(() => {
    loadGoldPrices();
  }, []);

  useEffect(() => {
    if (fetcher.data?.success === false) {
      shopify.toast.show(
        fetcher.data.error || "Failed to load gold prices",
      );
    }
  }, [fetcher.data, shopify]);

  const goldPrices = fetcher.data?.goldPrices;

  return (
    <s-page heading="Gold Prices">
      <s-section heading="Current Gold Prices">
        <s-paragraph>
          Latest saved gold prices used by the product price calculator.
        </s-paragraph>

        <s-button
          onClick={loadGoldPrices}
          {...(isLoading ? { loading: true } : {})}
        >
          Refresh Gold Prices
        </s-button>
      </s-section>

      {fetcher.data?.success && goldPrices && (
        <s-section heading="Latest Gold Prices">
          <s-stack direction="block" gap="base">

            {Object.entries(goldPrices).map(([karat, price]) => (
              <s-section
                key={karat}
                heading={`${karat} Gold`}
              >
                <s-paragraph>
                  <strong>
                    {Number(price).toFixed(2)}
                  </strong>
                  {fetcher.data.currency
                    ? ` ${fetcher.data.currency} / g`
                    : " / g"}
                </s-paragraph>
              </s-section>
            ))}

            {fetcher.data.currency && (
              <s-paragraph>
                Currency: {fetcher.data.currency}
              </s-paragraph>
            )}

            {fetcher.data.updatedAt && (
              <s-paragraph>
                Last updated:{" "}
                {new Date(
                  fetcher.data.updatedAt,
                ).toLocaleString()}
              </s-paragraph>
            )}

          </s-stack>
        </s-section>
      )}

      {fetcher.state === "loading" && !goldPrices && (
        <s-section heading="Loading">
          <s-paragraph>
            Loading saved gold prices...
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
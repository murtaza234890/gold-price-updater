import { useEffect } from "react";
import { useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function PriceHistory() {
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  useEffect(() => {
    fetcher.load("/api/price-history");
  }, []);

  useEffect(() => {
    if (fetcher.data?.success === false) {
      shopify.toast.show(
        fetcher.data.error || "Failed to load price history",
      );
    }
  }, [fetcher.data, shopify]);

  const history = fetcher.data?.history ?? [];

  return (
    <s-page heading="Price History">
      <s-section heading="Gold Price History">
        <s-paragraph>
          Historical gold prices used by the product price calculator.
        </s-paragraph>

        {fetcher.state === "loading" && !fetcher.data && (
          <s-paragraph>
            Loading price history...
          </s-paragraph>
        )}

        {fetcher.data?.success && history.length === 0 && (
          <s-paragraph>
            No price history available yet.
          </s-paragraph>
        )}

        {history.length > 0 && (
          <s-stack direction="block" gap="base">
            {history.map((record, index) => {
              const previous = history[index + 1];

              const calculateChange = (current, previousValue) => {
                if (
                  previousValue === undefined ||
                  previousValue === null ||
                  Number(previousValue) === 0
                ) {
                  return null;
                }

                return (
                  ((Number(current) - Number(previousValue)) /
                    Number(previousValue)) *
                  100
                );
              };

              const renderPriceChange = (
                current,
                previousValue,
              ) => {
                const change = calculateChange(
                  current,
                  previousValue,
                );

                if (change === null) {
                  return null;
                }

                if (change > 0) {
                  return `↑ +${change.toFixed(2)}%`;
                }

                if (change < 0) {
                  return `↓ ${change.toFixed(2)}%`;
                }

                return "— 0.00%";
              };

              return (
                <s-section
                  key={record.id}
                  heading={new Date(
                    record.updatedAt,
                  ).toLocaleString()}
                >
                  <s-stack
                    direction="block"
                    gap="base"
                  >
                    <s-paragraph>
                      <strong>24K</strong>{" "}
                      {previous
                        ? `AED ${Number(
                            previous.price24k,
                          ).toFixed(2)} → AED ${Number(
                            record.price24k,
                          ).toFixed(2)}`
                        : `AED ${Number(
                            record.price24k,
                          ).toFixed(2)}`}
                      {previous &&
                        ` ${renderPriceChange(
                          record.price24k,
                          previous.price24k,
                        )}`}
                    </s-paragraph>

                    <s-paragraph>
                      <strong>22K</strong>{" "}
                      {previous
                        ? `AED ${Number(
                            previous.price22k,
                          ).toFixed(2)} → AED ${Number(
                            record.price22k,
                          ).toFixed(2)}`
                        : `AED ${Number(
                            record.price22k,
                          ).toFixed(2)}`}
                      {previous &&
                        ` ${renderPriceChange(
                          record.price22k,
                          previous.price22k,
                        )}`}
                    </s-paragraph>

                    <s-paragraph>
                      <strong>20K</strong>{" "}
                      {previous
                        ? `AED ${Number(
                            previous.price20k,
                          ).toFixed(2)} → AED ${Number(
                            record.price20k,
                          ).toFixed(2)}`
                        : `AED ${Number(
                            record.price20k,
                          ).toFixed(2)}`}
                      {previous &&
                        ` ${renderPriceChange(
                          record.price20k,
                          previous.price20k,
                        )}`}
                    </s-paragraph>

                    <s-paragraph>
                      <strong>18K</strong>{" "}
                      {previous
                        ? `AED ${Number(
                            previous.price18k,
                          ).toFixed(2)} → AED ${Number(
                            record.price18k,
                          ).toFixed(2)}`
                        : `AED ${Number(
                            record.price18k,
                          ).toFixed(2)}`}
                      {previous &&
                        ` ${renderPriceChange(
                          record.price18k,
                          previous.price18k,
                        )}`}
                    </s-paragraph>

                    <s-paragraph>
                      <strong>14K</strong>{" "}
                      {previous
                        ? `AED ${Number(
                            previous.price14k,
                          ).toFixed(2)} → AED ${Number(
                            record.price14k,
                          ).toFixed(2)}`
                        : `AED ${Number(
                            record.price14k,
                          ).toFixed(2)}`}
                      {previous &&
                        ` ${renderPriceChange(
                          record.price14k,
                          previous.price14k,
                        )}`}
                    </s-paragraph>

                    <s-paragraph>
                      Currency: {record.currency}
                    </s-paragraph>
                  </s-stack>
                </s-section>
              );
            })}
          </s-stack>
        )}
      </s-section>

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
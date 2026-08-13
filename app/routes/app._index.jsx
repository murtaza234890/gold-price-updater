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

  const data = fetcher.data;

  useEffect(() => {
    if (data?.success) {
      shopify.toast.show(
        `Updated ${data.updatedProducts ?? 0} products`,
      );
    }

    if (data?.success === false) {
      shopify.toast.show(
        data.error || "Price update failed",
      );
    }
  }, [data, shopify]);

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

  const goldPrices = data?.goldPrices;

  const formatGoldPrice = (value) => {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      return "—";
    }

    return number.toFixed(2);
  };

  return (
    <s-page heading="Gold Price Updater">

      {/* =========================
          OVERVIEW
      ========================== */}

      <s-section heading="Overview">
        <s-stack direction="block" gap="base">

          <s-paragraph>
            Manage gold prices and update eligible Shopify product
            variants from one place.
          </s-paragraph>

          <s-button
            onClick={updateAllPrices}
            {...(isLoading ? { loading: true } : {})}
          >
            Update All Product Prices
          </s-button>

        </s-stack>
      </s-section>


      {/* =========================
          GOLD PRICES
      ========================== */}

      {data?.success && goldPrices && (
        <s-section heading="Gold Prices">

          <s-stack direction="inline" gap="base">

            <s-section heading="24K">
              <s-paragraph>
                {formatGoldPrice(goldPrices["24k"])}
              </s-paragraph>
            </s-section>

            <s-section heading="22K">
              <s-paragraph>
                {formatGoldPrice(goldPrices["22k"])}
              </s-paragraph>
            </s-section>

            <s-section heading="20K">
              <s-paragraph>
                {formatGoldPrice(goldPrices["20k"])}
              </s-paragraph>
            </s-section>

            <s-section heading="18K">
              <s-paragraph>
                {formatGoldPrice(goldPrices["18k"])}
              </s-paragraph>
            </s-section>

            <s-section heading="14K">
              <s-paragraph>
                {formatGoldPrice(goldPrices["14k"])}
              </s-paragraph>
            </s-section>

          </s-stack>

          {data.updatedAt && (
            <s-paragraph>
              Last updated:{" "}
              {new Date(data.updatedAt).toLocaleString()}
            </s-paragraph>
          )}

        </s-section>
      )}


      {/* =========================
          UPDATE SUMMARY
      ========================== */}

      {data?.success && (
        <s-section heading="Update Summary">

          <s-stack direction="block" gap="base">

            <s-paragraph>
              Products found:{" "}
              <strong>
                {data.processedProducts ?? 0}
              </strong>
            </s-paragraph>

            <s-paragraph>
              Products updated:{" "}
              <strong>
                {data.updatedProducts ?? 0}
              </strong>
            </s-paragraph>

            <s-paragraph>
              Products skipped:{" "}
              <strong>
                {data.skippedProducts ?? 0}
              </strong>
            </s-paragraph>

            <s-paragraph>
              Products with errors:{" "}
              <strong>
                {data.errorProducts ?? 0}
              </strong>
            </s-paragraph>

          </s-stack>

        </s-section>
      )}


      {/* =========================
          PRODUCT RESULTS
      ========================== */}

      {data?.success && data.results?.length > 0 && (
        <s-section heading="Products">

          <s-stack direction="block" gap="base">

            {data.results.map((product, index) => {

              const isUpdated =
                product.status === "updated";

              const isSkipped =
                product.status === "skipped";

              const isError =
                product.status === "error";

              return (
                <s-section
                  key={`${product.product}-${index}`}
                  heading={product.product || "Product"}
                >

                  <s-paragraph>
                    Status:{" "}
                    {isUpdated
                      ? "Updated"
                      : isSkipped
                        ? "Skipped"
                        : isError
                          ? "Error"
                          : product.status}
                  </s-paragraph>

                  {product.reason && (
                    <s-paragraph>
                      Reason: {product.reason}
                    </s-paragraph>
                  )}

                  {product.calculation && (
                    <s-stack
                      direction="block"
                      gap="small"
                    >

                      <s-paragraph>
                        Gold Value:{" "}
                        {Number(
                          product.calculation.goldValue ?? 0,
                        ).toFixed(2)}
                      </s-paragraph>

                      <s-paragraph>
                        Atelier Fee:{" "}
                        {Number(
                          (
                            (product.calculation.craftsmanship ??
                              0) +
                            (product.calculation.engraving ??
                              0) +
                            (product.calculation.packaging ??
                              0)
                          ),
                        ).toFixed(2)}
                      </s-paragraph>

                      <s-paragraph>
                        Total Price:{" "}
                        {Number(
                          product.calculation.total ?? 0,
                        ).toFixed(2)}
                      </s-paragraph>

                    </s-stack>
                  )}

                  {product.updatedVariants?.length > 0 && (
                    <s-stack
                      direction="block"
                      gap="small"
                    >

                      <s-paragraph>
                        Updated Variants
                      </s-paragraph>

                      {product.updatedVariants.map(
                        (variant) => (
                          <s-paragraph
                            key={variant.id}
                          >
                            {variant.title}:{" "}
                            {variant.price}
                          </s-paragraph>
                        ),
                      )}

                    </s-stack>
                  )}

                </s-section>
              );
            })}

          </s-stack>

        </s-section>
      )}


      {/* =========================
          ERRORS
      ========================== */}

      {data?.success &&
        data.results?.some(
          (product) => product.status === "error",
        ) && (
          <s-section heading="Errors">

            <s-stack direction="block" gap="base">

              {data.results
                .filter(
                  (product) =>
                    product.status === "error",
                )
                .map((product, index) => (
                  <s-section
                    key={`${product.product}-${index}`}
                    heading={product.product || "Product"}
                  >

                    <s-paragraph>
                      {product.reason ||
                        "Unknown error"}
                    </s-paragraph>

                  </s-section>
                ))}

            </s-stack>

          </s-section>
        )}


      {/* =========================
          GENERAL ERROR
      ========================== */}

      {data?.success === false && (
        <s-section heading="Error">

          <s-paragraph>
            {data.error ||
              "Price update failed"}
          </s-paragraph>

        </s-section>
      )}

    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
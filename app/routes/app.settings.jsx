import { useState } from "react";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";

export async function loader({ request }) {
  await authenticate.admin(request);

  return {
    settings: {
      currency: "AED",
      autoUpdate: true,
      updateInterval: 10,
      craftsmanshipFee: 20,
      personalEngravingFee: 5,
      premiumPackagingFee: 5,
    },
  };
}

export default function Settings() {
  const { settings } = useLoaderData();

  const [currency, setCurrency] = useState(settings.currency);
  const [autoUpdate, setAutoUpdate] = useState(settings.autoUpdate);
  const [updateInterval, setUpdateInterval] = useState(
    settings.updateInterval,
  );
  const [craftsmanshipFee, setCraftsmanshipFee] = useState(
    settings.craftsmanshipFee,
  );
  const [personalEngravingFee, setPersonalEngravingFee] = useState(
    settings.personalEngravingFee,
  );
  const [premiumPackagingFee, setPremiumPackagingFee] = useState(
    settings.premiumPackagingFee,
  );

  const saveSettings = () => {
    /*
     * Settings UI is ready.
     *
     * Database persistence will be connected after
     * the settings structure is finalized.
     */
    console.log({
      currency,
      autoUpdate,
      updateInterval,
      craftsmanshipFee,
      personalEngravingFee,
      premiumPackagingFee,
    });
  };

  return (
    <s-page heading="Settings">
      <s-section heading="General Settings">
        <s-stack direction="block" gap="base">

          <s-paragraph>
            Configure how gold prices and product pricing are managed.
          </s-paragraph>

          <s-select
            label="Store Currency"
            value={currency}
            onChange={(event) =>
              setCurrency(event.target.value)
            }
          >
            <s-option value="AED">AED</s-option>
            <s-option value="USD">USD</s-option>
            <s-option value="GBP">GBP</s-option>
            <s-option value="EUR">EUR</s-option>
            <s-option value="SAR">SAR</s-option>
            <s-option value="QAR">QAR</s-option>
          </s-select>

        </s-stack>
      </s-section>

      <s-section heading="Automatic Price Updates">
        <s-stack direction="block" gap="base">

          <s-checkbox
            checked={autoUpdate}
            onChange={(event) =>
              setAutoUpdate(event.target.checked)
            }
          >
            Enable automatic price updates
          </s-checkbox>

          <s-select
            label="Update Interval"
            value={String(updateInterval)}
            disabled={!autoUpdate}
            onChange={(event) =>
              setUpdateInterval(
                Number(event.target.value),
              )
            }
          >
            <s-option value="5">Every 5 minutes</s-option>
            <s-option value="10">Every 10 minutes</s-option>
            <s-option value="15">Every 15 minutes</s-option>
            <s-option value="30">Every 30 minutes</s-option>
          </s-select>

        </s-stack>
      </s-section>

      <s-section heading="Pricing Fees">
        <s-stack direction="block" gap="base">

          <s-number-field
            label="Craftsmanship Fee (%)"
            value={String(craftsmanshipFee)}
            min="0"
            max="100"
            step="0.01"
            onChange={(event) =>
              setCraftsmanshipFee(
                Number(event.target.value),
              )
            }
          />

          <s-number-field
            label="Personal Engraving Fee (%)"
            value={String(personalEngravingFee)}
            min="0"
            max="100"
            step="0.01"
            onChange={(event) =>
              setPersonalEngravingFee(
                Number(event.target.value),
              )
            }
          />

          <s-number-field
            label="Premium Packaging Fee (%)"
            value={String(premiumPackagingFee)}
            min="0"
            max="100"
            step="0.01"
            onChange={(event) =>
              setPremiumPackagingFee(
                Number(event.target.value),
              )
            }
          />

        </s-stack>
      </s-section>

      <s-section>
        <s-button variant="primary" onClick={saveSettings}>
          Save Settings
        </s-button>
      </s-section>
    </s-page>
  );
}
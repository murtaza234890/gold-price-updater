const GOLD_API_URL = "https://www.goldapi.io/api/XAU/USD";

export async function getGoldPrices() {
  const apiKey = process.env.GOLD_API_KEY;

  if (!apiKey) {
    throw new Error("GOLD_API_KEY is missing from .env");
  }

  const response = await fetch(GOLD_API_URL, {
    method: "GET",
    headers: {
      "x-access-token": apiKey,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `GoldAPI request failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();

  if (!data.price_gram_24k) {
    throw new Error("GoldAPI did not return a 24K gram price");
  }

  const price24k = data.price_gram_24k;

  return {
    "24k": price24k,
    "22k": price24k * (22 / 24),
    "20k": price24k * (20 / 24),
    "18k": price24k * (18 / 24),
    "14k": price24k * (14 / 24),
  };
}
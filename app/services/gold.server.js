import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const GOLD_API_URL =
  "https://www.goldapi.io/api/XAU/USD";

/**
 * Fetch fresh gold prices from GoldAPI.
 *
 * IMPORTANT:
 * This function should ONLY be called by the
 * dashboard Update All Products flow.
 */
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
    throw new Error(
      "GoldAPI did not return a 24K gram price",
    );
  }

  const price24k = Number(data.price_gram_24k);

  if (!Number.isFinite(price24k) || price24k <= 0) {
    throw new Error(
      "GoldAPI returned an invalid 24K gram price",
    );
  }

  return {
    "24k": price24k,
    "22k": price24k * (22 / 24),
    "20k": price24k * (20 / 24),
    "18k": price24k * (18 / 24),
    "14k": price24k * (14 / 24),
  };
}

/**
 * Save the latest successful gold prices.
 *
 * This uses one database record (id = 1).
 * Existing record is updated.
 */
export async function saveGoldPrices(goldPrices) {
  const prices = {
    price24k: Number(goldPrices["24k"]),
    price22k: Number(goldPrices["22k"]),
    price20k: Number(goldPrices["20k"]),
    price18k: Number(goldPrices["18k"]),
    price14k: Number(goldPrices["14k"]),
  };

  for (const [key, value] of Object.entries(prices)) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(
        `Invalid gold price: ${key}`,
      );
    }
  }

  return prisma.goldPrice.upsert({
    where: {
      id: 1,
    },

    update: prices,

    create: {
      id: 1,
      ...prices,
    },
  });
}

/**
 * Get the latest successfully saved gold prices.
 *
 * IMPORTANT:
 * This function DOES NOT call GoldAPI.
 */
export async function getLatestGoldPrices() {
  const savedPrices =
    await prisma.goldPrice.findUnique({
      where: {
        id: 1,
      },
    });

  if (!savedPrices) {
    throw new Error(
      "No saved gold prices found. Please run Update All Products first.",
    );
  }

  return {
    "24k": savedPrices.price24k,
    "22k": savedPrices.price22k,
    "20k": savedPrices.price20k,
    "18k": savedPrices.price18k,
    "14k": savedPrices.price14k,
    updatedAt: savedPrices.updatedAt,
  };
}
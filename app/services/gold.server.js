import { PrismaClient } from "@prisma/client";
import { USD_TO_AED } from "./pricing.js";

const prisma = new PrismaClient();

const DEFAULT_GOLD_API_URL =
  "https://marami-gold-api.murtazaali8875.workers.dev/api/gold-rates";

/**
 * Fetch fresh gold prices.
 * Supports Marami Gold Worker API (AED) and falls back to GoldAPI (USD).
 *
 * IMPORTANT:
 * This function should ONLY be called by the
 * dashboard Update All Products flow.
 */
export async function getGoldPrices() {
  const apiUrl = process.env.GOLD_API_URL || DEFAULT_GOLD_API_URL;
  const isGoldApiIo = apiUrl.includes("goldapi.io");

  const headers = {
    "Content-Type": "application/json",
  };

  if (isGoldApiIo) {
    const apiKey = process.env.GOLD_API_KEY;
    if (!apiKey) {
      throw new Error("GOLD_API_KEY is missing from .env for goldapi.io");
    }
    headers["x-access-token"] = apiKey;
  }

  const response = await fetch(apiUrl, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    throw new Error(
      `Gold API request failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();

  // 1. Worker API format (returns AED rates in data.rates)
  if (data.rates && (data.rates["24K"] || data.rates["24k"])) {
    const raw24k = Number(data.rates["24K"] || data.rates["24k"]);

    if (!Number.isFinite(raw24k) || raw24k <= 0) {
      throw new Error("Worker API returned an invalid 24K rate");
    }

    // Convert AED rate to base USD for app consistency
    const price24k = raw24k / USD_TO_AED;

    const parseRate = (karat) => {
      const val =
        data.rates[karat.toUpperCase()] ?? data.rates[karat.toLowerCase()];
      return Number(val) && Number(val) > 0
        ? Number(val) / USD_TO_AED
        : null;
    };

    return {
      "24k": price24k,
      "22k": parseRate("22k") ?? price24k * (22 / 24),
      "21k": parseRate("21k") ?? price24k * (21 / 24),
      "20k": parseRate("20k") ?? price24k * (20 / 24),
      "18k": parseRate("18k") ?? price24k * (18 / 24),
      "14k": parseRate("14k") ?? price24k * (14 / 24),
    };
  }

  // 2. Legacy GoldAPI format (data.price_gram_24k in USD)
  if (data.price_gram_24k) {
    const price24k = Number(data.price_gram_24k);

    if (!Number.isFinite(price24k) || price24k <= 0) {
      throw new Error("GoldAPI returned an invalid 24K gram price");
    }

    return {
      "24k": price24k,
      "22k": price24k * (22 / 24),
      "21k": price24k * (21 / 24),
      "20k": price24k * (20 / 24),
      "18k": price24k * (18 / 24),
      "14k": price24k * (14 / 24),
    };
  }

  throw new Error("Unrecognized gold price API response format");
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
    price21k: Number(goldPrices["21k"]),
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

    const latestPrice = await prisma.goldPrice.upsert({
    where: {
      id: 1,
    },

    update: prices,

    create: {
      id: 1,
      ...prices,
    },
  });

  const historyRate = USD_TO_AED;

  await prisma.goldPriceHistory.create({
    data: {
      price24k: Math.round(prices.price24k * historyRate * 100) / 100,
      price22k: Math.round(prices.price22k * historyRate * 100) / 100,
      price21k: Math.round(prices.price21k * historyRate * 100) / 100,
      price20k: Math.round(prices.price20k * historyRate * 100) / 100,
      price18k: Math.round(prices.price18k * historyRate * 100) / 100,
      price14k: Math.round(prices.price14k * historyRate * 100) / 100,
      currency: "AED",
    },
  });

  return latestPrice;
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
    "21k": savedPrices.price21k,
    "20k": savedPrices.price20k,
    "18k": savedPrices.price18k,
    "14k": savedPrices.price14k,
    updatedAt: savedPrices.updatedAt,
  };
}
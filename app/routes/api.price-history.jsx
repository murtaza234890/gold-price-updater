import { PrismaClient } from "@prisma/client";
import { authenticate } from "../shopify.server";

const prisma = new PrismaClient();

export async function loader({ request }) {
  await authenticate.admin(request);

  try {
    const history = await prisma.goldPriceHistory.findMany({
      orderBy: {
        updatedAt: "desc",
      },
      take: 60,
    });

    return Response.json({
      success: true,
      history,
    });
  } catch (error) {
    console.error("Price history API error:", error);

    return Response.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load price history",
      },
      { status: 500 },
    );
  }
}
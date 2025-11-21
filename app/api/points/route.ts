// app/api/points/route.ts
import { getDb } from "@/lib/mongodb";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lineId = searchParams.get("lineId");

  if (!lineId || typeof lineId !== "string") {
    return Response.json(
      { success: false, message: "lineId จำเป็น" },
      { status: 400 }
    );
  }

  try {
    const db = await getDb();
    const user = await db.collection("user").findOne({ lineId });
    const totalPoints = user?.totalPoints ?? 0;

    return Response.json({ success: true, totalPoints });
  } catch (error) {
    console.error("Error in /api/points (GET):", error);
    return Response.json(
      { success: false, message: "ไม่สามารถโหลดแต้มได้" },
      { status: 500 }
    );
  }
}
// app/api/redeem/route.ts
import { getDb } from "@/lib/mongodb";

export async function POST(req: Request) {
  try {
    const { lineId, code } = await req.json();

    if (!lineId || typeof lineId !== "string" || !code || typeof code !== "string") {
      return Response.json({ success: false, message: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const db = await getDb();

    const data = await db.collection("codes").findOne({ code: cleanCode });
    if (!data) {
      return Response.json({ success: false, message: "รหัสไม่ถูกต้อง" }, { status: 400 });
    }
    if (data.usedBy) {
      return Response.json({ success: false, message: "รหัสนี้ถูกใช้ไปแล้ว" }, { status: 400 });
    }

    const points = data.points;
    if (typeof points !== "number" || points <= 0 || !Number.isInteger(points)) {
      return Response.json({ success: false, message: "ข้อมูลรหัสไม่ถูกต้อง" }, { status: 500 });
    }

    // บันทึกประวัติ
    await db.collection("points").insertOne({
      lineId,
      points,
      type: "earn",
      description: "Claim Code",
      date: new Date(),
    });

    // อัปเดตแต้มผู้ใช้
    await db.collection("user").updateOne(
      { lineId },
      {
        $setOnInsert: {
          name: "",
          picture: "",
          totalPoints: 0,
          createdAt: new Date(),
        },
        $inc: { totalPoints: points },
      },
      { upsert: true }
    );

    // ทำเครื่องหมายว่าใช้แล้ว
    await db.collection("codes").updateOne(
      { code: cleanCode },
      { $set: { usedBy: lineId, usedAt: new Date() } }
    );

    return Response.json({ success: true, message: `คุณได้รับ ${points} แต้ม` });
  } catch (error) {
    console.error("Error in /api/redeem:", error);
    return Response.json({ success: false, message: "เกิดข้อผิดพลาดภายในระบบ" }, { status: 500 });
  }
}
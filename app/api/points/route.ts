import clientPromise from "@/lib/mongodb";

export async function POST(req: Request) {
  const { lineId, code } = await req.json();

  const client = await clientPromise;
  const db = client.db("liffmembership");

  // --- 1) หา code ว่ามีไหม
  const data = await db.collection("codes").findOne({ code });

  if (!data) {
    return Response.json({ success: false, message: "รหัสไม่ถูกต้อง" }, { status: 400 });
  }

  if (data.usedBy) {
    return Response.json({ success: false, message: "รหัสนี้ถูกใช้ไปแล้ว" }, { status: 400 });
  }

  const points = data.points;

  // --- 2) บันทึกประวัติ
  await db.collection("points").insertOne({
    lineId,
    points,
    type: "earn",
    description: "Claim Code",
    date: new Date()
  });

  // --- 3) เพิ่มแต้มให้ user
  await db.collection("user").updateOne(
    { lineId },
    {
      $setOnInsert: {
        name: "",
        picture: "",
        totalPoints: 0,
        createdAt: new Date()
      },
      $inc: { totalPoints: points }
    },
    { upsert: true }
  );

  // --- 4) mark code ว่าใช้แล้ว
  await db.collection("codes").updateOne(
    { code },
    { $set: { usedBy: lineId, usedAt: new Date() } }
  );

  return Response.json({
    success: true,
    message: `คุณได้รับ ${points} แต้ม`
  });
}

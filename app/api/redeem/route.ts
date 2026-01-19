// app/api/redeem/route.ts
import { getFirestoreDB } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const db = getFirestoreDB();
    const { lineId, code } = await req.json();

    if (!lineId || typeof lineId !== 'string' || !code || typeof code !== 'string') {
      return Response.json({ success: false, message: 'ข้อมูลไม่ถูกต้อง' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();

    const codeDoc = await db.collection('Code').where('code', '==', cleanCode).limit(1).get();
    const codeData = codeDoc.docs[0]?.data();

    if (!codeData) {
      return Response.json({ success: false, message: 'รหัสไม่ถูกต้อง' }, { status: 400 });
    }
    if (codeData.usedBy) {
      return Response.json({ success: false, message: 'รหัสนี้ถูกใช้ไปแล้ว' }, { status: 400 });
    }

    const points = codeData.points;
    if (typeof points !== 'number' || points <= 0 || !Number.isInteger(points)) {
      return Response.json({ success: false, message: 'ข้อมูลรหัสไม่ถูกต้อง' }, { status: 500 });
    }

    const batch = db.batch();

    // Add point history
    const pointRef = db.collection('Point').doc();
    batch.set(pointRef, {
      id: pointRef.id,
      lineId,
      points,
      type: 'earn',
      description: 'Claim Code',
      date: new Date(),
    });

    // Get or create user and update totalPoints
    const userQuery = await db.collection('User').where('lineId', '==', lineId).limit(1).get();
    if (userQuery.docs.length > 0) {
      const userRef = userQuery.docs[0].ref;
      batch.update(userRef, {
        totalPoints: (userQuery.docs[0].data().totalPoints || 0) + points,
      });
    } else {
      const userRef = db.collection('User').doc();
      batch.set(userRef, {
        id: userRef.id,
        lineId,
        name: '',
        picture: '',
        totalPoints: points,
        createdAt: new Date(),
      });
    }

    // Mark code as used
    const codeRef = codeDoc.docs[0].ref;
    batch.update(codeRef, {
      usedBy: lineId,
      usedAt: new Date(),
    });

    await batch.commit();

    return Response.json({ success: true, message: `คุณได้รับ ${points} แต้ม` });
  } catch (error) {
    console.error('Error in /api/redeem:', error);
    return Response.json({ success: false, message: 'เกิดข้อผิดพลาดภายในระบบ' }, { status: 500 });
  }
}
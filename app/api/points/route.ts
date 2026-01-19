// app/api/points/route.ts
import { getFirestoreDB } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lineId = searchParams.get('lineId');

  if (!lineId || typeof lineId !== 'string') {
    return Response.json({ success: false, message: 'lineId จำเป็น' }, { status: 400 });
  }

  try {
    const db = getFirestoreDB();
    const userDoc = await db.collection('User').where('lineId', '==', lineId).limit(1).get();
    const user = userDoc.docs[0]?.data();
    const totalPoints = user?.totalPoints ?? 0;

    return Response.json({ success: true, totalPoints });
  } catch (error) {
    console.error('Error in /api/points (GET):', error);
    return Response.json({ success: false, message: 'ไม่สามารถโหลดแต้มได้' }, { status: 500 });
  }
}
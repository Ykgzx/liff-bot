import { getFirestoreDB } from '@/lib/prisma';

/**
 * Seed 10 electronics FAQ entries to Firestore
 * Run this once to populate the FAQ collection
 */
export async function seedElectronicsFAQ() {
  const db = getFirestoreDB();
  
  const faqs = [
    {
      question: 'อุปกรณ์อิเล็กทรอนิกส์มีอายุการรับประกันเท่าไร?',
      answer: 'อุปกรณ์อิเล็กทรอนิกส์ส่วนใหญ่มีการรับประกันจากผู้ผลิต 1 ปี ครอบคลุมข้อบกพร่องในวัสดุและการผลิต มีตัวเลือกการรับประกันเพิ่มเติมนานถึง 3 ปี',
      category: 'warranty',
      keywords: ['ประกัน', 'รับประกัน', 'คุ้มครอง', 'warranty'],
    },
    {
      question: 'คุณขายอุปกรณ์อิเล็กทรอนิกส์ที่ใช้แล้วหรือไม่?',
      answer: 'ใช่ เรามีอุปกรณ์อิเล็กทรอนิกส์ที่เคยใช้แล้วในราคาลดพิเศษ ทุกสินค้าถูกทดสอบและตรวจสอบแล้ว มาพร้อมประกัน 6 เดือน',
      category: 'product_type',
      keywords: ['ใช้แล้ว', 'มือสอง', 'ลดราคา', 'refurbished'],
    },
    {
      question: 'วิธีการชำระเงินมีอะไรบ้าง?',
      answer: 'เรายอมรับบัตรเครดิต บัตรเดบิต กระเป๋าดิจิทัล (Apple Pay, Google Pay) และโอนเงินธนาคาร มีตัวเลือกชำระเป็นงวดสำหรับสินค้ากว่า 500 บาท',
      category: 'payment',
      keywords: ['ชำระเงิน', 'บัตร', 'โอน', 'payment'],
    },
    {
      question: 'ส่งสินค้าใช้เวลากี่วัน?',
      answer: 'ส่งแบบปกติใช้เวลา 5-7 วันทำการ มีบริการส่งด่วน 2-3 วัน และส่งในวันถัดไปสำหรับลูกค้าพิเศษ สินค้าทั้งหมดมีการประกันระหว่างการขนส่ง',
      category: 'shipping',
      keywords: ['ส่ง', 'การจัดส่ง', 'วัน', 'shipping'],
    },
    {
      question: 'ฉันสามารถคืนสินค้าได้หรือไม่หากเปลี่ยนใจ?',
      answer: 'ใช่ เรามีนโยบายคืนเงิน 30 วันสำหรับอุปกรณ์ทั้งหมด สินค้าต้องอยู่ในสภาพดีพร้อมอุปกรณ์เสริมทั้งหมด การคืนเงินจะดำเนินการภายใน 5-7 วันทำการ',
      category: 'returns',
      keywords: ['คืน', 'เงินคืน', 'แลก', 'return'],
    },
    {
      question: 'อุปกรณ์ใช้ได้กับระบบไฟฟ้าต่างประเทศหรือไม่?',
      answer: 'อุปกรณ์สมัยใหม่ส่วนใหญ่รองรับแรงดันไฟฟ้า 100-240V แต่คุณอาจต้องใช้อะแดปเตอร์สำหรับปลั๊กต่างชนิด ตรวจสอบข้อมูลจำเพาะของสินค้าหรือติดต่อทีมสนับสนุน',
      category: 'technical',
      keywords: ['ไฟ', 'แรงดัน', 'แอดแดปเตอร์', 'power'],
    },
    {
      question: 'ฉันจะเลือกสินค้าให้เหมาะสมได้อย่างไร?',
      answer: 'เยี่ยมชมเว็บไซต์และใช้เครื่องมือค้นหาสินค้า คุณสามารถกรองตามแบรนด์ ข้อมูลจำเพาะ ช่วงราคา และคะแนนของลูกค้า ทีมสนับสนุนยังสามารถให้คำแนะนำส่วนบุคคล',
      category: 'purchasing',
      keywords: ['เลือก', 'แบบ', 'ขนาด', 'select'],
    },
    {
      question: 'บริการลูกค้าของคุณมีเวลาให้บริการเท่าไร?',
      answer: 'ทีมสนับสนุนเราให้บริการ 24/7 ผ่านอีเมล แชทสด และโทรศัพท์ เวลาตอบสนองเฉลี่ยน้อยกว่า 2 ชั่วโมง เรามีการสนับสนุนหลายภาษารวมถึงไทย อังกฤษ และจีน',
      category: 'support',
      keywords: ['สนับสนุน', 'ติดต่อ', 'ช่วยเหลือ', 'support'],
    },
    {
      question: 'อุปกรณ์มีการช่วยเหลือในการติดตั้งหรือไม่?',
      answer: 'ใช่ เรามีบริการช่วยเหลือในการติดตั้งผ่านโทรศัพท์หรือวิดีโอฟรี 30 วันหลังจากซื้อ ลูกค้าพิเศษได้รับบริการติดตั้งที่บ้าน มีคู่มือและสอนการใช้งานออนไลน์ด้วย',
      category: 'service',
      keywords: ['ติดตั้ง', 'ช่วยเหลือ', 'การใช้งาน', 'setup'],
    },
    {
      question: 'อุปกรณ์ไหนขายดีที่สุดเดือนนี้?',
      answer: 'อุปกรณ์ขายดีเรามี หูฟังไร้สาย อุปกรณ์บ้านอัจฉริยะ แท่นชาร์จพกพา และอุปกรณ์เสริมแล็ปท็อป ดูส่วน "Trending Now" ในเว็บไซต์เพื่อดูรายชื่อสินค้าลึกลับและรีวิวจากลูกค้า',
      category: 'products',
      keywords: ['ขายดี', 'ยอดนิยม', 'ล่าสุด', 'bestseller'],
    },
  ];

  try {
    const batch = db.batch();
    
    for (const faq of faqs) {
      const docRef = db.collection('FAQ').doc();
      batch.set(docRef, {
        id: docRef.id,
        ...faq,
        createdAt: new Date(),
      });
    }

    await batch.commit();
    console.log('✓ Successfully seeded 10 electronics FAQs to Firestore');
    return { success: true, count: faqs.length };
  } catch (error) {
    console.error('✗ Error seeding FAQs:', error);
    throw error;
  }
}

/**
 * Run this function once to populate the FAQ collection
 * Can be called from a Next.js API route or development script
 */
if (require.main === module) {
  seedElectronicsFAQ()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

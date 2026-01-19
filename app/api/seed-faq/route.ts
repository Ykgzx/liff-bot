import { searchFAQ } from '@/app/utils/faqSearch';

/**
 * API endpoint to seed electronics FAQ
 * POST /api/seed-faq
 * POST /api/seed-faq?reseed=true (delete old data first)
 * 
 * This is a one-time setup endpoint to populate Firestore with Thai electronics Q&A pairs
 */
export async function POST(req: Request) {
  try {
    // Optional: Add authentication check here
    const authHeader = req.headers.get('authorization');
    const seedToken = process.env.SEED_TOKEN;
    
    if (seedToken && authHeader !== `Bearer ${seedToken}`) {
      return new Response(
        JSON.stringify({ success: false, message: 'Unauthorized' }),
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const reseed = url.searchParams.get('reseed') === 'true';

    // Delete old FAQ if reseed is requested
    if (reseed) {
      const { deleteAllFAQ } = await import('@/app/utils/deleteFAQ');
      await deleteAllFAQ();
    }

    // Import and run the seeding function
    const { seedElectronicsFAQ } = await import('@/app/utils/seedFAQ');
    const result = await seedElectronicsFAQ();

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully seeded ${result.count} Thai electronics FAQs`,
        data: result,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in /api/seed-faq:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to seed FAQ',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * GET endpoint to search FAQ
 * GET /api/seed-faq?query=warranty
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query');

    if (!query) {
      return new Response(
        JSON.stringify({ success: false, message: 'Query parameter required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const faq = await searchFAQ(query);

    if (!faq) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No FAQ found matching your query',
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: faq }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in /api/seed-faq GET:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : 'Error searching FAQ',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

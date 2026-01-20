import { getFirestoreDB } from '@/lib/prisma';

export interface Product {
    id: string;
    name: string;
    sku: string;
    barcode?: string;
    unit: string;
    size: string;
    img?: string;
    promotionPrice: number;
    priceTier1: number;
    priceTier2: number;
    priceTier3: number;
    discountPerPiece: number;
    stockQuantity: number;
    stockStatus: string;
    categories?: string;
    FDA_No?: string;
    Markdown?: string;
}

/**
 * Search products by name, category, or keywords
 * Returns matching products from Firestore
 */
export async function searchProducts(query: string, limit: number = 10): Promise<Product[]> {
    try {
        const db = getFirestoreDB();
        const snapshot = await db.collection('products').get();

        if (snapshot.empty) {
            return [];
        }

        const docs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as Product[];

        // Normalize query for Thai text matching
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);

        // Score-based matching
        const scoredProducts = docs.map(product => {
            let score = 0;
            const nameLower = (product.name || '').toLowerCase();
            const categoryLower = (product.categories || '').toLowerCase();
            const markdownLower = (product.Markdown || '').toLowerCase();

            // Check each query word
            for (const word of queryWords) {
                // Exact match in name (highest priority)
                if (nameLower.includes(word)) {
                    score += 10;
                }
                // Match in category
                if (categoryLower.includes(word)) {
                    score += 5;
                }
                // Match in markdown description
                if (markdownLower.includes(word)) {
                    score += 3;
                }
                // Match in SKU/barcode
                if (product.sku?.includes(word) || product.barcode?.includes(word)) {
                    score += 8;
                }
            }

            return { product, score };
        });

        // Filter and sort by score
        return scoredProducts
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map(item => item.product);
    } catch (error) {
        if (error instanceof Error && error.message.includes('Firestore not configured')) {
            return [];
        }
        console.error('Error searching products:', error);
        return [];
    }
}

/**
 * Get all products (for AI context)
 */
export async function getAllProducts(): Promise<Product[]> {
    try {
        const db = getFirestoreDB();
        const snapshot = await db.collection('products').get();

        if (snapshot.empty) {
            return [];
        }

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        })) as Product[];
    } catch (error) {
        console.error('Error fetching products:', error);
        return [];
    }
}

/**
 * Get product by ID or SKU
 */
export async function getProductById(id: string): Promise<Product | null> {
    try {
        const db = getFirestoreDB();
        const doc = await db.collection('products').doc(id).get();

        if (!doc.exists) {
            return null;
        }

        return { id: doc.id, ...doc.data() } as Product;
    } catch (error) {
        console.error('Error fetching product:', error);
        return null;
    }
}

/**
 * Format products for AI context (concise format)
 */
export function formatProductsForAI(products: Product[]): string {
    if (products.length === 0) {
        return 'ไม่พบสินค้าในระบบ';
    }

    return products.map(p =>
        `- ${p.name} | ราคา: ${p.promotionPrice}฿ | หมวดหมู่: ${p.categories || 'ไม่ระบุ'}`
    ).join('\n');
}

import { NextResponse } from 'next/server';
import { scrapeAmazon } from '@/lib/scrapers/amazon';
import fs from 'fs';
import path from 'path';
import { loadHotProducts } from '@/lib/promotions';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'todos';

  try {
    // 1. Try to load from synced hot products (Supabase or Local File)
    const hotData = await loadHotProducts();
    
    if (hotData) {
      // AUTOMATIC SYNC LOGIC: Every :00 and :30 (UTC-3 / Brasilia)
      const now = new Date();
      const lastSync = hotData.lastSync ? new Date(hotData.lastSync) : new Date(0);
      
      // Calculate how many minutes since the last sync
      const diffMs = now.getTime() - lastSync.getTime();
      const diffMins = diffMs / (1000 * 60);

      // Trigger if:
      // 1. More than 5 mins since last sync
      if (diffMins >= 5) {
        console.log(`[AutoSync] Triggering scheduled sync (Last: ${lastSync.toISOString()}, Now: ${now.toISOString()})...`);
        fetch(`${new URL(request.url).origin}/api/amazon/sync`, { 
          method: 'POST', 
          body: JSON.stringify({ config: { isAuto: true } }),
          headers: { 'Content-Type': 'application/json' }
        }).catch(() => {});
      }

      let products = [];
      
      // Load active category IDs to filter out deleted/deactivated ones
      let activeCatIds: string[] = [];
      try {
        const catsPath = path.join(process.cwd(), 'src/data', 'categories.json');
        if (fs.existsSync(catsPath)) {
          const catsData = JSON.parse(fs.readFileSync(catsPath, 'utf-8'));
          activeCatIds = catsData.map((c: any) => c.id);
        }
      } catch (e) {}

      if (category === 'todos') {
        // Balanced approach: Pick best deals from EACH category to ensure variety
        const balancedProducts: any[] = [];
        const perCategoryLimit = 15; // Max products to take from each category for the main feed
        
        // 1. Add Global Deals first (High priority)
        const globalDeals = hotData['ofertas_gerais'] || [];
        balancedProducts.push(...globalDeals.slice(0, 10));

        // 2. Add best from each active category
        Object.entries(hotData as Record<string, any[]>).forEach(([key, items]) => {
          if (activeCatIds.includes(key) && Array.isArray(items)) {
            // Sort by discount for this specific category slice
            const sortedItems = [...items].sort((a, b) => (b.discount || 0) - (a.discount || 0));
            balancedProducts.push(...sortedItems.slice(0, perCategoryLimit));
          }
        });

        // 3. Shuffle for dynamic feel
        products = balancedProducts.sort(() => Math.random() - 0.5);
      } else {
        // Get specific category plus matching global deals
        // Only return if category is active
        if (activeCatIds.includes(category)) {
          products = (hotData[category] || []);
        }
        
        // Also add global deals that might be relevant or just fill the list
        const globalDeals = hotData['ofertas_gerais'] || [];
        // If we have few products, supplement with global deals
        if (products.length < 20) {
          products = [...products, ...globalDeals];
        }
      }

      if (products.length > 0) {
        return NextResponse.json({ products, source: 'hot_sync' });
      }
    }

    // 2. Fallback to dynamic scraping if no synced data
    const type = searchParams.get('type') || 'bestsellers';
    
    // Try to find custom slug from categories.json
    let amazonSlug: string | undefined = undefined;
    try {
      const catsPath = path.join(process.cwd(), 'src/data', 'categories.json');
      if (fs.existsSync(catsPath)) {
        const cats = JSON.parse(fs.readFileSync(catsPath, 'utf-8'));
        amazonSlug = cats.find((c: any) => c.id === category)?.amazonSlug;
      }
    } catch (e) {}

    const products = await scrapeAmazon(category, type, amazonSlug);
    return NextResponse.json({ products, source: 'dynamic', type });
  } catch (error) {
    console.error('Error in Amazon API:', error);
    return NextResponse.json({ error: 'Erro ao buscar do Amazon', products: [] }, { status: 500 });
  }
}

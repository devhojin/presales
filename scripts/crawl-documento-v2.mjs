/**
 * documento.co.kr 상품 크롤링 v2 - 정밀 추출
 * imweb의 JS 렌더링 후 실제 상품 데이터 추출
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const PRODUCT_IDS = [
  195, 194, 200, 145, 134, 135, 116, 191, 175, 186,
  104, 184, 101, 166, 163, 157, 152, 130, 132, 96,
  196, 193, 192, 197, 182, 181, 180, 173, 170, 131,
  171, 168, 154, 158, 143, 142, 150, 146, 141, 140,
  139, 121, 95, 99, 129, 97, 103, 187, 92, 190,
  185, 165, 98, 94, 91, 102, 93, 108, 133, 138,
  136, 151, 169, 155, 156, 159, 183, 162, 174, 113,
  178, 114
];

const BASE_URL = 'https://www.documento.co.kr/shop_view/?idx=';
const OUTPUT_DIR = path.join(process.cwd(), 'scripts', 'crawl-output');

async function crawlProduct(page, idx) {
  const url = `${BASE_URL}${idx}`;
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    // Wait longer for imweb JS rendering
    await new Promise(r => setTimeout(r, 4000));

    // First, dump the page structure to understand selectors
    const data = await page.evaluate((productIdx) => {
      const result = {
        idx: productIdx,
        title: '',
        price: null,
        originalPrice: null,
        salePrice: null,
        isFree: false,
        description: '',
        descriptionHtml: '',
        thumbnailUrl: '',
        category: '',
        allText: '',
      };

      // --- TITLE ---
      // imweb shop typically uses specific class patterns
      // Try getting product name from various patterns
      const titleSelectors = [
        '.product-name', '.shop-name', '.prd-name',
        '.shop_product_name', '.item_name', '.goods_name',
        'h1.product-title', 'h2.product-title',
        '.detail-name', '.shop-detail .name',
        '[data-product-name]',
        '.editor-product-name',
      ];
      for (const sel of titleSelectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent.trim()) {
          result.title = el.textContent.trim();
          break;
        }
      }

      // Try h1, h2 if still no title
      if (!result.title) {
        const headings = document.querySelectorAll('h1, h2, h3');
        for (const h of headings) {
          const text = h.textContent.trim();
          if (text.length > 5 && text.length < 200 && !text.includes('프리세일즈 도큐멘토')) {
            result.title = text;
            break;
          }
        }
      }

      // --- PRICE ---
      // imweb uses specific price patterns
      const priceSelectors = [
        '.product-price .sale-price', '.product-price .price',
        '.shop-price .sale', '.shop-price .price',
        '.prd-price', '.item_price', '.goods_price',
        '.detail-price .price', '.shop_product_price',
        '.editor-product-price',
        '[data-product-price]',
      ];
      for (const sel of priceSelectors) {
        const el = document.querySelector(sel);
        if (el) {
          const nums = el.textContent.replace(/[^0-9]/g, '');
          if (nums) {
            result.price = parseInt(nums);
            break;
          }
        }
      }

      // Original price (crossed out)
      const origSelectors = [
        '.product-price .origin-price', '.product-price del',
        '.shop-price .origin', '.shop-price del', '.shop-price s',
        '.original-price', '.regular-price',
      ];
      for (const sel of origSelectors) {
        const el = document.querySelector(sel);
        if (el) {
          const nums = el.textContent.replace(/[^0-9]/g, '');
          if (nums) {
            result.originalPrice = parseInt(nums);
            break;
          }
        }
      }

      // --- DESCRIPTION ---
      const descSelectors = [
        '.product-desc', '.product-description',
        '.shop-desc', '.prd-desc',
        '.detail-desc', '.shop_product_description',
        '.se-main-container', '.fr-view',
        '.editor-product-description',
        '.product-content', '.detail-content',
        '[data-product-description]',
      ];
      for (const sel of descSelectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent.trim().length > 20) {
          result.description = el.textContent.trim().substring(0, 3000);
          result.descriptionHtml = el.innerHTML.substring(0, 10000);
          break;
        }
      }

      // --- CATEGORY ---
      const catSelectors = [
        '.product-category', '.shop-category',
        '.breadcrumb', '.category-name',
      ];
      for (const sel of catSelectors) {
        const el = document.querySelector(sel);
        if (el) {
          result.category = el.textContent.trim();
          break;
        }
      }

      // --- THUMBNAIL ---
      // imweb uses specific image containers
      const imgSelectors = [
        '.product-image img', '.product-thumb img',
        '.shop-image img', '.prd-image img',
        '.detail-image img', '.shop_product_image img',
        '.swiper-wrapper img', '.product-gallery img',
        '.editor-product-image img',
      ];
      for (const sel of imgSelectors) {
        const el = document.querySelector(sel);
        if (el && el.src && !el.src.includes('data:')) {
          result.thumbnailUrl = el.src;
          break;
        }
      }

      // Fallback: get any large image that looks like a product image
      if (!result.thumbnailUrl) {
        const allImgs = document.querySelectorAll('img');
        for (const img of allImgs) {
          if (img.src && img.src.includes('cdn') && img.naturalWidth > 200) {
            result.thumbnailUrl = img.src;
            break;
          }
        }
      }

      // --- ALL TEXT for debugging ---
      // Get meaningful text blocks for manual analysis
      const textBlocks = [];
      document.querySelectorAll('div, p, span, h1, h2, h3, h4').forEach(el => {
        const text = el.textContent.trim();
        if (text.length > 10 && text.length < 500 && !textBlocks.includes(text)) {
          textBlocks.push(text);
        }
      });
      result.allText = textBlocks.slice(0, 30).join('\n---\n');

      // Free check
      const bodyText = document.body.textContent;
      if (bodyText.includes('무료') && (result.price === 0 || !result.price)) {
        result.isFree = true;
      }

      return result;
    }, idx);

    const shortTitle = data.title || '(no title)';
    console.log(`✓ idx=${idx}: "${shortTitle.substring(0,50)}" | ₩${data.price || 'N/A'}`);

    return data;
  } catch (err) {
    console.log(`✗ idx=${idx}: ${err.message}`);
    return { idx, error: err.message };
  }
}

async function main() {
  console.log(`\n🚀 Crawling ${PRODUCT_IDS.length} products (v2 - detailed extraction)\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  // First, crawl ONE product and dump full text for analysis
  console.log('--- Analyzing page structure with idx=195 ---');
  const analysisPage = await browser.newPage();
  await analysisPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  await analysisPage.goto(`${BASE_URL}195`, { waitUntil: 'networkidle2', timeout: 45000 });
  await new Promise(r => setTimeout(r, 5000));

  // Dump all classes and IDs for debugging
  const pageStructure = await analysisPage.evaluate(() => {
    const elements = [];
    document.querySelectorAll('[class], [id]').forEach(el => {
      const cls = el.className?.toString?.() || '';
      const id = el.id || '';
      const tag = el.tagName.toLowerCase();
      const text = el.textContent?.trim()?.substring(0, 100) || '';
      if ((cls || id) && text.length > 3) {
        elements.push({ tag, cls: cls.substring(0, 100), id, text: text.substring(0, 80) });
      }
    });
    // Deduplicate by class
    const seen = new Set();
    return elements.filter(e => {
      const key = `${e.tag}.${e.cls}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 100);
  });

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'page-structure-195.json'),
    JSON.stringify(pageStructure, null, 2), 'utf8'
  );
  console.log(`Saved page structure analysis (${pageStructure.length} elements)\n`);

  // Also dump the full rendered HTML title area
  const fullContent = await analysisPage.evaluate(() => {
    return {
      bodyClasses: document.body.className,
      mainContent: document.querySelector('main, #content, .content, .shop-detail, .product-detail, [role="main"]')?.innerHTML?.substring(0, 5000) || 'NOT FOUND',
      h1s: Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim()),
      h2s: Array.from(document.querySelectorAll('h2')).map(h => h.textContent.trim()),
      h3s: Array.from(document.querySelectorAll('h3')).map(h => h.textContent.trim()),
      allImgSrcs: Array.from(document.querySelectorAll('img')).map(i => ({ src: i.src?.substring(0, 120), alt: i.alt, cls: i.className })).slice(0, 20),
      priceTexts: Array.from(document.querySelectorAll('[class*="price"], [class*="Price"], [class*="cost"], [class*="amount"]')).map(e => ({ cls: e.className, text: e.textContent.trim().substring(0, 50) })),
    };
  });
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'page-content-195.json'),
    JSON.stringify(fullContent, null, 2), 'utf8'
  );
  console.log('Saved full content analysis for idx=195\n');

  await analysisPage.close();

  // Now crawl all products
  const results = [];
  const BATCH_SIZE = 3;

  for (let i = 0; i < PRODUCT_IDS.length; i += BATCH_SIZE) {
    const batch = PRODUCT_IDS.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (idx) => {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        try {
          return await crawlProduct(page, idx);
        } finally {
          await page.close();
        }
      })
    );
    results.push(...batchResults);
    if ((i + BATCH_SIZE) % 15 === 0 || i + BATCH_SIZE >= PRODUCT_IDS.length) {
      console.log(`  [${Math.min(i + BATCH_SIZE, PRODUCT_IDS.length)}/${PRODUCT_IDS.length}]\n`);
    }
  }

  await browser.close();

  // Save full results
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'documento-products-v2.json'),
    JSON.stringify(results, null, 2), 'utf8'
  );

  // Summary with price distribution
  const prices = results.filter(r => r.price).map(r => r.price);
  const uniquePrices = [...new Set(prices)].sort((a, b) => a - b);
  console.log(`\n📊 Results: ${results.length} products`);
  console.log(`With title: ${results.filter(r => r.title && !r.title.includes('프리세일즈 도큐멘토')).length}`);
  console.log(`With description: ${results.filter(r => r.description && r.description.length > 50).length}`);
  console.log(`Price distribution: ${uniquePrices.map(p => `₩${p.toLocaleString()}`).join(', ')}`);
  console.log(`\nSaved to: scripts/crawl-output/documento-products-v2.json`);
}

main().catch(console.error);

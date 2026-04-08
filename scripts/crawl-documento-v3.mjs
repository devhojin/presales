/**
 * documento.co.kr 상품 크롤링 v3 - imweb 구조 기반 정밀 추출
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
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function crawlProduct(page, idx) {
  const url = `${BASE_URL}${idx}`;
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise(r => setTimeout(r, 3000));

    const data = await page.evaluate((productIdx) => {
      const result = {
        idx: productIdx,
        title: '',
        price: null,
        originalPrice: null,
        isFree: false,
        description: '',
        descriptionHtml: '',
        thumbnailUrl: '',
        thumbnailUrls: [],
        category: '',
        breadcrumb: [],
      };

      // --- TITLE: h1 태그 중 실제 상품명 (사이트 타이틀이 아닌 것) ---
      const h1s = document.querySelectorAll('h1');
      for (const h of h1s) {
        const text = h.textContent.trim();
        if (text && !text.includes('프리세일즈 도큐멘토') && text.length > 2 && text.length < 200) {
          result.title = text;
          break;
        }
      }

      // --- PRICE: .real_price 또는 .total_price ---
      const realPrice = document.querySelector('.real_price');
      if (realPrice) {
        const nums = realPrice.textContent.replace(/[^0-9]/g, '');
        if (nums) result.price = parseInt(nums);
      }
      if (!result.price) {
        const totalPrice = document.querySelector('.total_price');
        if (totalPrice) {
          const nums = totalPrice.textContent.replace(/[^0-9]/g, '');
          if (nums) result.price = parseInt(nums);
        }
      }

      // Original price (할인 전)
      const origPrice = document.querySelector('.origin_price, .consumer_price, del .price, s .price');
      if (origPrice) {
        const nums = origPrice.textContent.replace(/[^0-9]/g, '');
        if (nums) result.originalPrice = parseInt(nums);
      }

      // Free check
      if (result.price === 0) result.isFree = true;
      const freeEl = document.querySelector('.shop_sale_label, .free-label');
      if (freeEl && freeEl.textContent.includes('무료')) result.isFree = true;

      // --- DESCRIPTION: .fr-view 또는 상품 상세 영역 ---
      // imweb 상품 상세는 보통 #prod_detail_info 또는 .shop-detail-desc, .fr-view
      const descSelectors = [
        '#prod_detail_info .fr-view',
        '#prod_detail_info',
        '.shop-detail-desc .fr-view',
        '.shop-detail-desc',
        '.shop_explan_detail .fr-view',
        '.shop_explan_detail',
        '.goods_description .fr-view',
        '.goods_description',
      ];
      for (const sel of descSelectors) {
        const el = document.querySelector(sel);
        if (el) {
          const text = el.textContent.trim();
          if (text.length > 20) {
            result.description = text.substring(0, 5000);
            result.descriptionHtml = el.innerHTML.substring(0, 20000);
            break;
          }
        }
      }

      // Fallback: find any .fr-view with substantial content
      if (!result.description) {
        const frViews = document.querySelectorAll('.fr-view');
        for (const fv of frViews) {
          const text = fv.textContent.trim();
          if (text.length > 50) {
            result.description = text.substring(0, 5000);
            result.descriptionHtml = fv.innerHTML.substring(0, 20000);
            break;
          }
        }
      }

      // --- CATEGORY: breadcrumb ---
      const breadcrumbs = document.querySelectorAll('.sub_depth li a');
      breadcrumbs.forEach(a => {
        const text = a.textContent.trim();
        if (text) result.breadcrumb.push(text);
      });
      if (result.breadcrumb.length > 1) {
        result.category = result.breadcrumb[result.breadcrumb.length - 1];
      }

      // --- THUMBNAILS: owl-carousel images ---
      const carouselImgs = document.querySelectorAll('.prod-owl-list .item img, .owl-carousel .item img');
      carouselImgs.forEach(img => {
        if (img.src && !img.src.includes('data:')) {
          result.thumbnailUrls.push(img.src);
        }
      });
      if (result.thumbnailUrls.length > 0) {
        result.thumbnailUrl = result.thumbnailUrls[0];
      }

      // Fallback thumbnail
      if (!result.thumbnailUrl) {
        const mainImg = document.querySelector('#main-image');
        if (mainImg && mainImg.src) result.thumbnailUrl = mainImg.src;
      }

      return result;
    }, idx);

    const desc = data.description ? `desc=${data.description.length}chars` : 'NO DESC';
    console.log(`✓ idx=${idx}: "${data.title?.substring(0,45)}" | ₩${data.price ?? 'N/A'} | ${desc} | imgs=${data.thumbnailUrls.length}`);

    return data;
  } catch (err) {
    console.log(`✗ idx=${idx}: ${err.message}`);
    return { idx, error: err.message };
  }
}

async function main() {
  console.log(`\n🚀 Crawling ${PRODUCT_IDS.length} products (v3 - imweb-specific)\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

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
  }

  await browser.close();

  // Save
  const outputPath = path.join(OUTPUT_DIR, 'documento-products-v3.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');

  // Stats
  const withTitle = results.filter(r => r.title);
  const withPrice = results.filter(r => r.price !== null);
  const withDesc = results.filter(r => r.description && r.description.length > 50);
  const withImg = results.filter(r => r.thumbnailUrl);
  const withCat = results.filter(r => r.category);
  const errors = results.filter(r => r.error);

  console.log(`\n📊 Summary:`);
  console.log(`  Total: ${results.length}`);
  console.log(`  With title: ${withTitle.length}`);
  console.log(`  With price: ${withPrice.length}`);
  console.log(`  With description (>50 chars): ${withDesc.length}`);
  console.log(`  With thumbnail: ${withImg.length}`);
  console.log(`  With category: ${withCat.length}`);
  console.log(`  Errors: ${errors.length}`);

  // Price distribution
  const prices = [...new Set(results.filter(r => r.price).map(r => r.price))].sort((a, b) => a - b);
  console.log(`  Prices: ${prices.map(p => `₩${p.toLocaleString()}`).join(', ')}`);

  console.log(`\n✅ Saved to ${outputPath}`);
}

main().catch(console.error);

/**
 * documento.co.kr 상품 크롤링 스크립트
 * - 76개 상품의 제목, 설명, 가격, 썸네일 이미지 추출
 * - 결과를 JSON으로 저장
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

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
const IMG_DIR = path.join(OUTPUT_DIR, 'thumbnails');

// Ensure output dirs exist
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(IMG_DIR, { recursive: true });

function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadImage(res.headers.location, filepath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const ws = fs.createWriteStream(filepath);
      res.pipe(ws);
      ws.on('finish', () => { ws.close(); resolve(filepath); });
      ws.on('error', reject);
    }).on('error', reject);
  });
}

async function crawlProduct(page, idx) {
  const url = `${BASE_URL}${idx}`;
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for content to render
    await page.waitForSelector('body', { timeout: 5000 });
    await new Promise(r => setTimeout(r, 2000)); // extra wait for JS rendering

    const data = await page.evaluate((productIdx) => {
      const result = {
        idx: productIdx,
        title: '',
        description: '',
        descriptionHtml: '',
        price: null,
        originalPrice: null,
        isFree: false,
        thumbnailUrl: '',
        category: '',
        images: [],
      };

      // Title - try multiple selectors
      const titleEl = document.querySelector('.shop-detail-title, .product-title, h1, .item-title, [class*="title"]');
      if (titleEl) result.title = titleEl.textContent.trim();
      if (!result.title) result.title = document.title.replace(' - documento', '').replace(' - 도큐멘토', '').trim();

      // Price - try multiple selectors
      const priceEls = document.querySelectorAll('.shop-detail-price, .product-price, [class*="price"], [class*="cost"]');
      priceEls.forEach(el => {
        const text = el.textContent.trim();
        const nums = text.replace(/[^0-9]/g, '');
        if (nums && !result.price) {
          result.price = parseInt(nums);
        }
      });

      // Check for sale/original price
      const saleEl = document.querySelector('[class*="sale"], [class*="discount"], [class*="origin"], del, s');
      if (saleEl) {
        const nums = saleEl.textContent.replace(/[^0-9]/g, '');
        if (nums) result.originalPrice = parseInt(nums);
      }

      // Free check
      const bodyText = document.body.textContent;
      if (bodyText.includes('무료') && (result.price === 0 || !result.price)) {
        result.isFree = true;
      }

      // Description - try multiple selectors
      const descEl = document.querySelector('.shop-detail-desc, .product-desc, .product-description, [class*="description"], [class*="detail-content"], .se-main-container, .fr-view');
      if (descEl) {
        result.description = descEl.textContent.trim().substring(0, 2000);
        result.descriptionHtml = descEl.innerHTML.substring(0, 5000);
      }

      // Category
      const catEl = document.querySelector('.shop-detail-category, [class*="category"], .breadcrumb');
      if (catEl) result.category = catEl.textContent.trim();

      // Thumbnail/Main image
      const imgSelectors = [
        '.shop-detail-image img',
        '.product-image img',
        '.product-thumbnail img',
        '[class*="thumb"] img',
        '[class*="main-image"] img',
        '.swiper-slide img',
        '.shop-detail img',
      ];

      for (const sel of imgSelectors) {
        const img = document.querySelector(sel);
        if (img && img.src) {
          result.thumbnailUrl = img.src;
          break;
        }
      }

      // All product images
      const allImgs = document.querySelectorAll('.shop-detail img, .product-image img, [class*="gallery"] img, .swiper-slide img');
      allImgs.forEach(img => {
        if (img.src && !img.src.includes('data:') && !result.images.includes(img.src)) {
          result.images.push(img.src);
        }
      });

      return result;
    }, idx);

    console.log(`✓ idx=${idx}: ${data.title || '(no title)'} | price=${data.price || 'N/A'} | img=${data.thumbnailUrl ? 'YES' : 'NO'}`);

    // Download thumbnail
    if (data.thumbnailUrl) {
      try {
        const ext = data.thumbnailUrl.match(/\.(jpg|jpeg|png|gif|webp)/i)?.[1] || 'png';
        const imgPath = path.join(IMG_DIR, `documento-${idx}.${ext}`);
        await downloadImage(data.thumbnailUrl, imgPath);
        data.localThumbnail = `documento-${idx}.${ext}`;
      } catch (e) {
        console.log(`  ⚠ Image download failed for idx=${idx}: ${e.message}`);
      }
    }

    return data;
  } catch (err) {
    console.log(`✗ idx=${idx}: ${err.message}`);
    return { idx, title: '', error: err.message };
  }
}

async function main() {
  console.log(`\n🚀 Starting crawl of ${PRODUCT_IDS.length} products from documento.co.kr\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const results = [];
  const BATCH_SIZE = 3; // 3 pages in parallel

  for (let i = 0; i < PRODUCT_IDS.length; i += BATCH_SIZE) {
    const batch = PRODUCT_IDS.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (idx) => {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
        await page.setViewport({ width: 1280, height: 800 });
        try {
          return await crawlProduct(page, idx);
        } finally {
          await page.close();
        }
      })
    );
    results.push(...batchResults);
    console.log(`  [${Math.min(i + BATCH_SIZE, PRODUCT_IDS.length)}/${PRODUCT_IDS.length}] done\n`);
  }

  await browser.close();

  // Save results
  const outputPath = path.join(OUTPUT_DIR, 'documento-products.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\n✅ Saved ${results.length} products to ${outputPath}`);

  // Summary
  const withTitle = results.filter(r => r.title && !r.error);
  const withPrice = results.filter(r => r.price !== null && r.price !== undefined);
  const withImg = results.filter(r => r.thumbnailUrl);
  const withDesc = results.filter(r => r.description);
  const errors = results.filter(r => r.error);

  console.log(`\n📊 Summary:`);
  console.log(`  Total: ${results.length}`);
  console.log(`  With title: ${withTitle.length}`);
  console.log(`  With price: ${withPrice.length}`);
  console.log(`  With image: ${withImg.length}`);
  console.log(`  With description: ${withDesc.length}`);
  console.log(`  Errors: ${errors.length}`);
}

main().catch(console.error);

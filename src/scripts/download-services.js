const fs = require('fs');
const path = require('path');
const https = require('https');

const urls = [
  'https://johnnybits.com/wp-content/uploads/2020/06/fluid-web-design-company-in-nigeria.png',
  'https://johnnybits.com/wp-content/uploads/2020/05/responsive-website-design-agency-in-nigeria-img1.png',
  'https://johnnybits.com/wp-content/uploads/2020/05/search-engine-optimization-seo-advance-analytics.png',
  'https://johnnybits.com/wp-content/uploads/2020/05/ecommerce-solutions.png',
  'https://johnnybits.com/wp-content/uploads/2021/01/Mobile-App-Development-Company-in-Ibadan-Nigeria.jpg',
  'https://johnnybits.com/wp-content/uploads/2021/01/Graphic-Design-Company-in-Ibadan-Nigeria.jpg',
  'https://johnnybits.com/wp-content/uploads/2020/05/ico-web-support-maintenance-support.png'
];

const destDir = path.join(__dirname, '../../public/assets/services');
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

async function download() {
  for (const url of urls) {
    const filename = url.split('/').pop();
    const dest = path.join(destDir, filename);
    
    await new Promise((resolve, reject) => {
      https.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
        }
      }, (res) => {
        if (res.statusCode !== 200) {
          console.error(`Failed to download ${url}: ${res.statusCode}`);
          resolve();
          return;
        }
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`Downloaded ${filename}`);
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => {});
        console.error(`Error downloading ${url}: ${err.message}`);
        resolve();
      });
    });
  }
}

download();

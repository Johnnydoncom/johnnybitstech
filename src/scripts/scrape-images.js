const fs = require('fs');
const path = require('path');

async function scrape() {
  try {
    const res = await fetch('https://johnnybits.com', {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });
    const html = await res.text();
    
    // Look for lazy loaded images
    const dataSrcRegex = /data-opt-src=["']([^"']+)["']/g;
    let match;
    const urls = [];
    while ((match = dataSrcRegex.exec(html)) !== null) {
      urls.push(match[1]);
    }
    
    // Regular images
    const srcRegex = /<img[^>]+src=["']([^"']+)["']/g;
    while ((match = srcRegex.exec(html)) !== null) {
      if (!match[1].includes('optm_lazyload') && !match[1].includes('data:image')) {
        urls.push(match[1]);
      }
    }

    const unique = [...new Set(urls)].filter(u => 
      !u.includes('logo') && 
      !u.includes('icon') &&
      !u.includes('svg')
    );
    
    console.log(JSON.stringify(unique, null, 2));
  } catch (err) {
    console.error(err);
  }
}
scrape();

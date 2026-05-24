const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(path.join(dir, f));
  });
}

walk('src/app', (filePath) => {
  if (!filePath.endsWith('.tsx') || filePath.includes('layout.tsx') || filePath.includes('providers.tsx')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add use client
  if (!content.includes('"use client"')) {
    content = '"use client";\n' + content;
  }
  
  // Replace imports
  content = content.replace(/import \{.*Link.*\} from "react-router-dom";/g, 'import Link from "next/link";\nimport { useParams, useRouter } from "next/navigation";');
  content = content.replace(/import \{.*Navigate.*\} from "react-router-dom";/g, ''); 
  content = content.replace(/import \{ useParams \} from "react-router-dom";/g, 'import { useParams, useRouter } from "next/navigation";');
  content = content.replace(/import \{ Link, useParams, Navigate \} from "react-router-dom";/g, 'import Link from "next/link";\nimport { useParams, useRouter } from "next/navigation";');

  // Remove SEO
  content = content.replace(/import \{ SEO \} from "@\/components\/SEO";\n?/g, '');
  content = content.replace(/<SEO[\s\S]*?\/>\n?/g, '');
  
  // Replace Link to= with Link href=
  content = content.replace(/<Link([^>]*?)to=/g, '<Link$1href=');
  
  // Replace <Navigate to=... replace /> with useRouter().replace(...) 
  content = content.replace(/<Navigate\s+to="(.*?)"\s+replace\s*\/>/g, '{(() => { window.location.href = "$1"; return null; })()}');

  // Fix any remaining react-router-dom imports
  content = content.replace(/import \{.*?\} from "react-router-dom";\n?/g, '');

  fs.writeFileSync(filePath, content);
});

console.log("Migration script complete.");

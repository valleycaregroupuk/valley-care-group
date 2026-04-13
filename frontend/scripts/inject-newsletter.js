const fs = require('fs');
const path = require('path');

const newsletterHtml = `
          <form class="newsletter-form" onsubmit="window.submitNewsletter ? window.submitNewsletter(event) : null" style="margin-top:1.5rem">
            <div style="font-size:0.85rem; font-weight:600; color:var(--clr-gold-light); margin-bottom:0.5rem">Join our Newsletter</div>
            <div style="display:flex; gap:0.5rem">
              <input type="email" placeholder="Your email address" required style="flex:1; padding:0.5rem 0.75rem; border:1px solid rgba(255,255,255,0.15); background:rgba(0,0,0,0.2); color:#fff; border-radius:4px; font-size:0.85rem; outline:none;">
              <button type="submit" class="btn btn-gold btn-sm" style="padding:0.5rem 1rem">Subscribe &rarr;</button>
            </div>
          </form>
          <div class="footer-social"`;

function getFiles(dir, files = []) {
  const fileList = fs.readdirSync(dir);
  for (const file of fileList) {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      if (!name.includes('.git') && !name.includes('node_modules') && !name.includes('backend')) {
        getFiles(name, files);
      }
    } else {
      if (name.endsWith('.html') && !name.includes('admin.html')) {
        files.push(name);
      }
    }
  }
  return files;
}

const targetDir = path.join(__dirname, '..');
const htmlFiles = getFiles(targetDir);

let count = 0;
for (const file of htmlFiles) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('class="newsletter-form"') && content.includes('<div class="footer-social"')) {
    content = content.replace('<div class="footer-social"', newsletterHtml);
    fs.writeFileSync(file, content, 'utf8');
    count++;
    console.log(`Injected: ${file}`);
  }
}
console.log(`Done. Injected info ${count} files.`);

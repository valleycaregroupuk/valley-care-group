const fs = require('fs');
const path = require('path');

const newsletterSection = `
  <section class="section" style="background:var(--clr-midnight); color:white; text-align:center; padding: 4rem 1rem;">
    <div class="container" style="max-width: 500px;">
      <h2 style="font-family:var(--font-serif);font-size:2rem;margin-bottom:1rem;color:var(--clr-gold-light)">Stay Updated</h2>
      <p style="color:var(--clr-cream);opacity:0.8;margin-bottom:2rem;">Join our newsletter to receive updates and news from Valley Care Group across all our homes.</p>
      <form class="newsletter-form" onsubmit="window.submitNewsletter ? window.submitNewsletter(event) : null">
        <div style="display:flex; gap:0.5rem; flex-wrap:wrap; justify-content:center;">
          <input type="email" placeholder="Your email address" required style="flex:1; min-width:200px; padding:0.75rem 1rem; border:1px solid rgba(255,255,255,0.2); background:rgba(255,255,255,0.05); color:#fff; border-radius:var(--radius-sm); font-size:1rem; outline:none;">
          <button type="submit" class="btn btn-gold">Subscribe &rarr;</button>
        </div>
      </form>
    </div>
  </section>
`;

function getFiles(dir, files = []) {
  const fileList = fs.readdirSync(dir);
  for (const file of fileList) {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      if (!name.includes('.git') && !name.includes('node_modules') && !name.includes('backend') && !name.includes('scripts')) {
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
  if (!content.includes('class="newsletter-form"')) {
    // Inject right before the footer
    if (content.includes('  <footer class="footer"')) {
      content = content.replace('  <footer class="footer"', newsletterSection + '\n  <footer class="footer"');
      fs.writeFileSync(file, content, 'utf8');
      count++;
      console.log(`Injected into: ${file}`);
    } else if (content.includes('  <footer class="footer-sig"')) {
      content = content.replace('  <footer class="footer-sig"', newsletterSection + '\n  <footer class="footer-sig"');
      fs.writeFileSync(file, content, 'utf8');
      count++;
      console.log(`Injected into: ${file}`);
    } else {
       console.log(`No footer found in ${file}`);
    }
  }
}
console.log(`Done. Injected into ${count} remaining files.`);

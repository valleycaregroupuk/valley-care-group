import os
import glob

def bust_cache():
    html_files = glob.glob('/Users/macbookair/Downloads/carehomes-wales/frontend/**/*.html', recursive=True)
    for path in html_files:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        new_content = content.replace('pages.css?v=2"', 'pages.css?v=3"')
        new_content = new_content.replace('signature.css?v=2"', 'signature.css?v=3"')
        new_content = new_content.replace('style.css?v=2"', 'style.css?v=3"')
        new_content = new_content.replace('pages.css"', 'pages.css?v=3"')
        new_content = new_content.replace('signature.css"', 'signature.css?v=3"')
        new_content = new_content.replace('style.css"', 'style.css?v=3"')
        
        if content != new_content:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new_content)
    print(f"Updated {len(html_files)} HTML files for cache busting")

if __name__ == "__main__":
    bust_cache()

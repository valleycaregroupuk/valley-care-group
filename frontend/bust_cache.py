import os
import glob

def bust_cache():
    html_files = glob.glob('/Users/macbookair/Downloads/carehomes-wales/frontend/**/*.html', recursive=True)
    for path in html_files:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        new_content = content.replace('pages.css"', 'pages.css?v=2"')
        
        if content != new_content:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(new_content)
    print(f"Updated {len(html_files)} HTML files for cache busting")

if __name__ == "__main__":
    bust_cache()

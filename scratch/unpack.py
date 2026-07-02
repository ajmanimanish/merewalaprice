import json, re

HTML_PATH = "/Users/manish/Desktop/merawalaprice/MereWalaPrice.html"
OUT_PATH = "/Users/manish/Desktop/merawalaprice/scratch/unpacked_template.html"

def main():
    with open(HTML_PATH, 'r') as f:
        content = f.read()
        
    # Extract the template script tag content
    # Look for: <script type="__bundler/template">...</script>
    m = re.search(r'<script type="__bundler/template">(.*?)</script>', content, re.DOTALL)
    if not m:
        print("Template tag not found!")
        return
        
    template_json = m.group(1).strip()
    template_str = json.loads(template_json)
    
    print(f"Unpacked template size: {len(template_str)} characters")
    
    # Let's also look for manifest tag to see if we should inline assets
    manifest_match = re.search(r'<script type="__bundler/manifest">(.*?)</script>', content, re.DOTALL)
    if manifest_match:
        try:
            manifest = json.loads(manifest_match.group(1).strip())
            print(f"Found manifest with {len(manifest)} assets.")
        except Exception as e:
            print("Failed to parse manifest JSON:", e)
            
    with open(OUT_PATH, 'w') as f:
        f.write(template_str)
        
    print(f"Saved unpacked template to {OUT_PATH}")

if __name__ == "__main__":
    main()

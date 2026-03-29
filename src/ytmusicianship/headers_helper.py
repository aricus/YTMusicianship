#!/usr/bin/env python3
"""
Headers-based auth helper for ytmusicapi.
Creates oauth.json from raw request headers.
"""
import json
import sys
from pathlib import Path


def parse_curl_headers(curl_command: str) -> dict:
    """
    Extract headers from a curl command.
    """
    headers = {}
    lines = curl_command.strip().split('\n')

    for line in lines:
        line = line.strip()
        # Look for -H 'header: value' patterns
        if line.startswith("-H '") and line.endswith("'"):
            header_line = line[3:-1]  # Remove -H '
            if ':' in header_line:
                key, value = header_line.split(':', 1)
                headers[key.strip()] = value.strip()

    return headers


def create_auth_from_curl(curl_command: str, output_path: str):
    """
    Create oauth.json from a curl command.
    """
    headers = parse_curl_headers(curl_command)

    if not headers:
        print("Error: No headers found in the curl command")
        print("Make sure you're copying the full curl command with all -H headers")
        sys.exit(1)

    # Check for required headers
    if 'cookie' not in headers and 'Cookie' not in headers:
        print("Warning: No 'cookie' header found")

    # Save all headers
    output = Path(output_path)
    output.write_text(json.dumps(headers, indent=2))

    print(f"\n✅ Saved {len(headers)} headers to {output_path}")
    print("\nTo verify it works:")
    print(f"  curl http://localhost:8082/api/health")


def interactive():
    """Interactive mode - paste curl command"""
    print("Headers-based Authentication Helper")
    print("=" * 50)
    print("\n1. Open music.youtube.com in Chrome (make sure you're logged in)")
    print("2. Press F12 → Network tab")
    print("3. Check 'Disable cache' and 'Preserve log' in the Network tab")
    print("4. Refresh the page (F5)")
    print("5. Look for the FIRST request to '/browse' (should have a JSON icon)")
    print("6. Right-click that request → Copy → Copy as cURL (bash)")
    print("7. Paste the ENTIRE curl command below, then press Ctrl+D:\n")

    # Read multi-line input
    lines = []
    try:
        while True:
            line = input()
            lines.append(line)
    except EOFError:
        pass

    curl_command = '\n'.join(lines)

    if not curl_command.strip():
        print("Error: No input provided")
        sys.exit(1)

    create_auth_from_curl(curl_command, "/app/data/oauth.json")


if __name__ == "__main__":
    if len(sys.argv) == 1:
        interactive()
    else:
        print("Usage: python headers_helper.py")
        print("   Then paste the curl command and press Ctrl+D")
        sys.exit(1)

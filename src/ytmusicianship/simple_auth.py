#!/usr/bin/env python3
"""
Simple auth helper that creates the exact format ytmusicapi expects.
"""
import json
import sys
from pathlib import Path


def create_auth_file(sid: str, login_info: str, authuser: str, output_path: str):
    """
    Create oauth.json with the headers format ytmusicapi expects.
    """
    # Build headers in the exact format ytmusicapi expects
    headers = {
        "cookie": f"SID={sid}; LOGIN_INFO={login_info}",
        "x-goog-authuser": authuser,
        "x-origin": "https://music.youtube.com",
        "x-youtube-client-name": "67",
        "x-youtube-client-version": "1.20260324.11.00",
        "origin": "https://music.youtube.com",
        "referer": "https://music.youtube.com/",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"
    }

    output = Path(output_path)
    output.write_text(json.dumps(headers, indent=2))
    print(f"\n✅ Saved auth to {output_path}")


def main():
    print("Simple YT Music Auth Helper")
    print("=" * 50)
    print("\n1. Open music.youtube.com (make sure you're logged in)")
    print("2. Press F12 → Application tab → Cookies → https://music.youtube.com")
    print("3. Find and copy these values:\n")

    sid = input("SID cookie: ").strip()
    login_info = input("LOGIN_INFO cookie: ").strip()
    authuser = input("x-goog-authuser (usually 0): ").strip() or "0"

    if not sid or not login_info:
        print("Error: SID and LOGIN_INFO are required")
        sys.exit(1)

    create_auth_file(sid, login_info, authuser, "/app/data/oauth.json")
    print("\nNow restart the container:")
    print("  docker restart ytmusicianship")
    print("\nThen test:")
    print("  curl http://localhost:8082/api/health")


if __name__ == "__main__":
    main()

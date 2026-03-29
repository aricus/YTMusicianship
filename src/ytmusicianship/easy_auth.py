#!/usr/bin/env python3
"""
Simple auth helper that creates oauth.json from browser cookies.
"""
import json
import sys
from pathlib import Path

def create_auth_from_cookies(sid: str, login_info: str, sapisid: str, authuser: str = "0"):
    """Create oauth.json from just 3 cookie values."""

    # ytmusicapi browser format - needs raw headers in a specific format
    headers = {
        "cookie": f"SID={sid}; LOGIN_INFO={login_info}; __Secure-3PAPISID={sapisid}",
        "x-goog-authuser": authuser,
        "x-origin": "https://music.youtube.com",
        "x-youtube-client-name": "67",
        "x-youtube-client-version": "1.20260324.11.00",
        "origin": "https://music.youtube.com",
        "referer": "https://music.youtube.com/",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36"
    }

    output = Path("/app/data/oauth.json")
    output.write_text(json.dumps(headers, indent=2))
    print(f"✅ Saved auth to {output}")
    print("\nNow restart the container:")
    print("  docker restart ytmusicianship")
    print("\nThen test:")
    print("  curl http://localhost:8082/api/health")

def main():
    print("Simple YT Music Auth Helper")
    print("=" * 50)
    print("\n1. Open music.youtube.com (make sure you're logged in)")
    print("2. Press F12 → Application tab → Cookies → https://music.youtube.com")
    print("3. Find and copy these values:\n")

    sid = input("SID cookie: ").strip()
    login_info = input("LOGIN_INFO cookie: ").strip()
    sapisid = input("__Secure-3PAPISID cookie: ").strip()
    authuser = input("x-goog-authuser (usually 0): ").strip() or "0"

    if not sid or not login_info or not sapisid:
        print("Error: All three cookies are required")
        sys.exit(1)

    create_auth_from_cookies(sid, login_info, sapisid, authuser)

if __name__ == "__main__":
    main()

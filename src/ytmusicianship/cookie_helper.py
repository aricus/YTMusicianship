#!/usr/bin/env python3
"""
Simple cookie-based auth helper for ytmusicapi.
This extracts cookies from browser and creates oauth.json
"""
import json
import sys
from pathlib import Path


def create_auth_from_cookies(sid: str, login_info: str, output_path: str):
    """
    Create oauth.json from browser cookies.

    Args:
        sid: The SID cookie value from music.youtube.com
        login_info: The LOGIN_INFO cookie value from music.youtube.com
        output_path: Where to save the oauth.json file
    """
    # Build the auth headers that ytmusicapi expects for browser-based auth
    auth_data = {
        "Authorization": f"Bearer {login_info}",
        "Cookie": f"SID={sid}; LOGIN_INFO={login_info}"
    }

    output = Path(output_path)
    output.write_text(json.dumps(auth_data, indent=2))
    print(f"\n✅ Saved auth to {output_path}")
    print("\nTo verify it works:")
    print(f"  curl http://localhost:8082/api/health")


def interactive():
    """Interactive mode - prompt for cookies"""
    print("Cookie-based Authentication Helper")
    print("=" * 50)
    print("\n1. Open music.youtube.com in your browser (make sure you're logged in)")
    print("2. Press F12 → Application tab → Cookies → https://music.youtube.com")
    print("3. Find and copy the following cookie values:\n")

    sid = input("SID cookie value: ").strip()
    login_info = input("LOGIN_INFO cookie value: ").strip()

    if not sid or not login_info:
        print("Error: Both cookies are required")
        sys.exit(1)

    create_auth_from_cookies(sid, login_info, "/app/data/oauth.json")


if __name__ == "__main__":
    if len(sys.argv) == 1:
        interactive()
    elif len(sys.argv) == 4:
        create_auth_from_cookies(sys.argv[1], sys.argv[2], sys.argv[3])
    else:
        print("Usage: python cookie_helper.py [SID] [LOGIN_INFO] [output_file]")
        print("   or: python cookie_helper.py  (for interactive mode)")
        sys.exit(1)

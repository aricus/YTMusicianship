#!/usr/bin/env python3
"""
OAuth helper to work around ytmusicapi bug with refresh_token_expires_in.
Run this inside the container to generate oauth.json.
"""
import json
import sys
from pathlib import Path

import requests


def oauth_device_flow(client_id: str, client_secret: str, output_path: str):
    """
    Perform OAuth device flow and save credentials.
    """
    # Step 1: Request device code
    device_url = "https://oauth2.googleapis.com/device/code"
    device_data = {
        "client_id": client_id,
        "scope": "https://www.googleapis.com/auth/youtube",
    }

    resp = requests.post(device_url, data=device_data)
    resp.raise_for_status()
    device_info = resp.json()

    print(f"\nGo to: {device_info['verification_url']}")
    print(f"Enter code: {device_info['user_code']}")
    print("\nPress Enter after you've completed the login...")
    input()

    # Step 2: Poll for token
    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        "client_id": client_id,
        "client_secret": client_secret,
        "device_code": device_info["device_code"],
        "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
    }

    resp = requests.post(token_url, data=token_data)
    resp.raise_for_status()
    token_info = resp.json()

    # Remove problematic field that causes ytmusicapi to crash
    if "refresh_token_expires_in" in token_info:
        del token_info["refresh_token_expires_in"]

    # Save token info (without oauth_credentials to avoid ytmusicapi bug)
    output = Path(output_path)
    output.write_text(json.dumps(token_info, indent=2))

    # Save credentials to a separate file
    creds_path = output.parent / "oauth_creds.json"
    creds_data = {
        "client_id": client_id,
        "client_secret": client_secret
    }
    creds_path.write_text(json.dumps(creds_data, indent=2))

    print(f"\n✅ Saved OAuth token to {output_path}")
    print(f"✅ Saved OAuth credentials to {creds_path}")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python oauth_helper.py <client_id> <client_secret> <output_file>")
        print("\nExample:")
        print('python oauth_helper.py "your-client-id.apps.googleusercontent.com" "your-secret" /app/data/oauth.json')
        sys.exit(1)

    client_id = sys.argv[1]
    client_secret = sys.argv[2]
    output_path = sys.argv[3]

    oauth_device_flow(client_id, client_secret, output_path)

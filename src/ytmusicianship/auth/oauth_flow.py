"""OAuth flow for YouTube Music authentication."""
import json
import secrets
from pathlib import Path
from typing import Optional

from ytmusicapi.auth.oauth import OAuthCredentials

# In-memory store for OAuth state (in production, use Redis or database)
_oauth_states: dict[str, dict] = {}


def generate_oauth_url(
    client_id: str,
    client_secret: str,
    redirect_uri: str,
    state: Optional[str] = None,
) -> tuple[str, str]:
    """Generate OAuth URL and state for YouTube Music authentication.

    Returns:
        Tuple of (auth_url, state)
    """
    if state is None:
        state = secrets.token_urlsafe(32)

    creds = OAuthCredentials(client_id=client_id, client_secret=client_secret)

    # Generate the authorization URL
    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
        f"&response_type=code"
        f"&scope=https://www.googleapis.com/auth/youtube"
        f"&state={state}"
        f"&access_type=offline"
        f"&prompt=consent"
    )

    # Store state
    _oauth_states[state] = {
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
    }

    return auth_url, state


def exchange_code(
    code: str,
    state: str,
    oauth_path: Path,
) -> dict:
    """Exchange OAuth code for tokens and save to file.

    Args:
        code: The authorization code from Google
        state: The state parameter for verification
        oauth_path: Path to save the oauth.json file

    Returns:
        Dict with status and message
    """
    if state not in _oauth_states:
        return {"status": "error", "message": "Invalid state parameter"}

    stored = _oauth_states.pop(state)
    client_id = stored["client_id"]
    client_secret = stored["client_secret"]

    try:
        creds = OAuthCredentials(client_id=client_id, client_secret=client_secret)

        # Exchange the code for tokens
        import requests

        token_url = "https://oauth2.googleapis.com/token"
        data = {
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": stored["redirect_uri"],
            "grant_type": "authorization_code",
        }

        response = requests.post(token_url, data=data)
        response.raise_for_status()
        token_data = response.json()

        # Save the oauth.json file
        oauth_path.parent.mkdir(parents=True, exist_ok=True)
        with open(oauth_path, "w") as f:
            json.dump(token_data, f, indent=2)

        # Also save credentials for later use
        creds_path = oauth_path.parent / "oauth_creds.json"
        with open(creds_path, "w") as f:
            json.dump({"client_id": client_id, "client_secret": client_secret}, f, indent=2)

        return {"status": "ok", "message": "Authentication successful"}

    except Exception as e:
        return {"status": "error", "message": str(e)}

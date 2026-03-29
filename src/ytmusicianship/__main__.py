import uvicorn
from ytmusicianship.config import settings

if __name__ == "__main__":
    uvicorn.run(
        "ytmusicianship.api.main:app",
        host="0.0.0.0",
        port=settings.ytm_port,
        log_level=settings.ytm_log_level,
    )

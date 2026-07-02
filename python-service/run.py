import uvicorn
import os
from dotenv import load_dotenv

# Load local environment variables if present
load_dotenv()

if __name__ == "__main__":
    # In production, uvicorn can be scaled. For local dev, reload is enabled.
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )

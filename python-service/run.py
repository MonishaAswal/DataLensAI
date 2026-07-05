import uvicorn
import os
from dotenv import load_dotenv

# Load local environment variables if present
load_dotenv()

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    # Enable reload only in development mode
    is_dev = os.getenv("NODE_ENV", "development") == "development"
    
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=is_dev
    )

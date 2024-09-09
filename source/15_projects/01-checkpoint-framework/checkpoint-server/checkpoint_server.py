from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()


# Define the schema for a checkpoint
class Checkpoint(BaseModel):
    service_name: str
    timestamp: datetime
    input: Dict[str, Any]
    output: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = None


# Example storage (replace with actual DB integration)
checkpoint_storage = []


@app.post("/checkpoints")
async def ingest_checkpoint(checkpoint: Checkpoint):
    try:
        # Store the checkpoint (this is just a placeholder)
        checkpoint_storage.append(checkpoint.dict())
        return {"message": "Checkpoint recorded successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")


# Test route to view stored checkpoints (for development purposes)
@app.get("/checkpoints")
async def get_checkpoints():
    return checkpoint_storage

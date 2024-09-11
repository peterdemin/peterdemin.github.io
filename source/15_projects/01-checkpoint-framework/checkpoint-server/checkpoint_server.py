from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel


class Checkpoint(BaseModel):
    location: str
    timestamp: int
    input: str
    output: str


class CheckpointRepository:
    def add(self, checkpoint: Checkpoint) -> None:
        raise NotImplementedError()

    def fetch_all(self) -> List[Checkpoint]:
        raise NotImplementedError()


class InMemoryCheckpointRepository(CheckpointRepository):
    def __init__(self) -> None:
        self._storage: List[Checkpoint] = []

    def add(self, checkpoint: Checkpoint) -> None:
        self._storage.append(checkpoint)

    def fetch_all(self) -> List[Checkpoint]:
        return self._storage


class IngestionAPI:
    def __init__(self, checkpoint_repository: CheckpointRepository) -> None:
        self._checkpoint_repository = checkpoint_repository

    async def ingest_checkpoint(checkpoint: Checkpoint):
        try:
            # Store the checkpoint (this is just a placeholder)
            self._checkpoint_repository.add(checkpoint)
            return {"message": "Checkpoint recorded successfully."}
        except Exception as e:
            raise HTTPException(status_code=500, detail="Internal server error")

    async def get_checkpoints():
        return [
            checkpoint.dict()
            for checkpoint in self._checkpoint_repository.fetch_all()
        ]

    def register(self, app: FastAPI) -> None:
        app.post("/checkpoints")(self.ingest_checkpoint)
        app.get("/checkpoints")(self.get_checkpoints)


app = FastAPI()
IngestionAPI(InMemoryCheckpointRepository()).register(app)

from fastapi import FastAPI
from pydantic import BaseModel


class Checkpoint(BaseModel):
    location: str
    timestamp: int
    input: str
    output: str


class CheckpointRepository:
    def add(self, checkpoint: Checkpoint) -> None:
        raise NotImplementedError()

    def fetch_all(self) -> list[Checkpoint]:
        raise NotImplementedError()


class InMemoryCheckpointRepository(CheckpointRepository):
    def __init__(self) -> None:
        self._storage: list[Checkpoint] = []

    def add(self, checkpoint: Checkpoint) -> None:
        self._storage.append(checkpoint)

    def fetch_all(self) -> list[Checkpoint]:
        return self._storage


class IngestionAPI:
    def __init__(self, checkpoint_repository: CheckpointRepository) -> None:
        self._checkpoint_repository = checkpoint_repository

    async def ingest_checkpoint(self, checkpoint: Checkpoint) -> dict:
        self._checkpoint_repository.add(checkpoint)
        return {"status": "ok"}

    async def get_checkpoints(self) -> list[dict]:
        return [
            checkpoint.dict() for checkpoint in self._checkpoint_repository.fetch_all()
        ]

    def register(self, app: FastAPI) -> None:
        app.add_api_route("/checkpoints", self.ingest_checkpoint, methods=['POST'])
        app.add_api_route("/checkpoints", self.get_checkpoints, methods=['GET'])


app = FastAPI()
IngestionAPI(InMemoryCheckpointRepository()).register(app)

import time

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from httpx import AsyncClient
from pydantic import BaseModel

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://peter.demin.dev",
        "http://localhost",
        "http://localhost:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
SCHEDULE_URL = (
    "https://s3.amazonaws.com/kcm-alerts-realtime-prod/tripupdates_pb.json"
)


class Schedule:
    def __init__(self, cache_ttl: int = 60) -> None:
        self._updated_at = 0
        self._data = None
        self._ok = False
        self._cache_ttl = cache_ttl

    async def get(self) -> tuple[bool, dict]:
        if not self._data or self._updated_at < time.time() - self._cache_ttl:
            self._ok, self._data = await self._fetch()
            self._updated_at = time.time()
        return self._ok, self._data

    @staticmethod
    async def _fetch() -> tuple[bool, dict]:
        async with AsyncClient() as ac:
            response = await ac.get(SCHEDULE_URL)
        if response.status_code != 200:
            return False, {
                "error": "Tripupdates API returned non-200",
                "details": response.content,
            }
        return True, response.json()


class ScheduleAPI:
    def __init__(self, schedule: Schedule) -> None:
        self._schedule = schedule

    async def stop_times(self, stop_ids: str):
        ok, data = await self._schedule.get()
        if not ok:
            return {
                "error": "Tripupdates API returned non-200",
                "details": data,
            }
        return {
            "arrivals": {
                stop_id: self._extact_arrival_times(data, stop_id)
                for stop_id in stop_ids.split(",")
            },
            "routes": {
                stop_id: self._extact_routes(data, stop_id)
                for stop_id in stop_ids.split(",")
            },
        }

    def _extact_arrival_times(self, data: dict, stop_id: str) -> list[int]:
        arrivals = []
        for entity in data["entity"]:
            for stop_time_update in entity["trip_update"]["stop_time_update"]:
                if stop_time_update["stop_id"] == stop_id:
                    arrivals.append(stop_time_update["arrival"]["time"])
        return arrivals

    def _extact_routes(self, data: dict, stop_id: str) -> dict[int, list[str]]:
        routes = {}
        for entity in data["entity"]:
            arrivals = []
            for stop_time_update in entity["trip_update"]["stop_time_update"]:
                if stop_time_update["stop_id"] == stop_id:
                    arrivals.append(stop_time_update["arrival"]["time"])
            if arrivals:
                route_id = entity["trip_update"]["trip"]["route_id"]
                routes.setdefault(route_id, []).extend(arrivals)
        return {route_id: sorted(times) for route_id, times in routes.items()}

    def register(self, app: FastAPI, prefix: str = "") -> None:
        app.add_api_route("/bus/{stop_ids}", self.stop_times, methods=["GET"])


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
            checkpoint.dict()
            for checkpoint in self._checkpoint_repository.fetch_all()
        ]

    def register(self, app: FastAPI, prefix: str = "") -> None:
        app.add_api_route(
            f"{prefix}/checkpoints", self.ingest_checkpoint, methods=["POST"]
        )
        app.add_api_route(
            f"{prefix}/checkpoints", self.get_checkpoints, methods=["GET"]
        )


ScheduleAPI(Schedule()).register(app)
IngestionAPI(InMemoryCheckpointRepository()).register(app, "/cp")

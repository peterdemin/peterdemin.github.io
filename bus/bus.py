import time
import asyncio
from typing import Optional

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
SCHEDULE_URL = "https://s3.amazonaws.com/kcm-alerts-realtime-prod/tripupdates_pb.json"


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
        app.add_api_route(prefix + "/{stop_ids}", self.stop_times, methods=["GET"])


class Metadata(BaseModel):
    name: str
    location: str
    start_ts: float
    finish_ts: float
    context: str = ""
    input_hint: str = ""
    output_hint: str = ""


class Checkpoint(BaseModel):
    input: str
    output: str
    metadata: Metadata


class CheckpointRepository:
    def add(self, tenant: str, checkpoint: Checkpoint) -> None:
        raise NotImplementedError()

    def fetch_all(self, tenant: str) -> list[Checkpoint]:
        raise NotImplementedError()


class InMemoryCheckpointRepository(CheckpointRepository):
    DEFAULT_CHECKPOINT_LIMIT = 100
    DEFAULT_TTL = 60.0  # seconds

    def __init__(
        self, checkpoint_limit: int = DEFAULT_CHECKPOINT_LIMIT, ttl: float = DEFAULT_TTL
    ) -> None:
        self._storage: dict[str, list[tuple[float, Checkpoint]]] = {}
        self._checkpoint_limit = checkpoint_limit
        self._ttl = ttl

    def add(self, tenant: str, checkpoint: Checkpoint) -> None:
        self._trim_old(tenant)
        if len(self._storage[tenant]) > self._checkpoint_limit:
            self._storage[tenant] = self._storage[tenant][-self._checkpoint_limit:]
        self._storage[tenant].append((time.time(), checkpoint))

    def fetch_all(self, tenant: str) -> list[Checkpoint]:
        self._trim_old(tenant)
        return [v for _, v in self._storage[tenant]]

    def _trim_old(self, tenant: str) -> None:
        now = time.time()
        self._storage[tenant] = [
            (t, v) for t, v in (self._storage.get(tenant) or []) if now - t < self._ttl
        ]


class CheckpointAPI:
    def __init__(self, checkpoint_repository: CheckpointRepository) -> None:
        self._checkpoint_repository = checkpoint_repository

    async def ingest_checkpoint(self, tenant: str, checkpoint: Checkpoint) -> dict:
        self._checkpoint_repository.add(tenant, checkpoint)
        asyncio.sleep(0.1)
        return {"status": "ok"}

    async def get_checkpoints(self, tenant: str) -> list[dict]:
        return [
            checkpoint.dict()
            for checkpoint in self._checkpoint_repository.fetch_all(tenant)
        ]

    def register(self, app: FastAPI, prefix: str = "") -> None:
        app.add_api_route(
            prefix + "/{tenant}", self.ingest_checkpoint, methods=["POST"]
        )
        app.add_api_route(prefix + "/{tenant}", self.get_checkpoints, methods=["GET"])


ScheduleAPI(Schedule()).register(app, "/bus")
checkpoint_api = CheckpointAPI(InMemoryCheckpointRepository())
checkpoint_api.register(app, "/i8t")

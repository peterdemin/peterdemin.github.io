import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from httpx import AsyncClient

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://peter.demin.dev",
        "http://localhost",
        "http://localhost:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
SCHEDULE_URL = 'https://s3.amazonaws.com/kcm-alerts-realtime-prod/tripupdates_pb.json'

class Schedule:
    def __init__(self, cache_ttl: int = 60) -> None:
        self._updated_at = 0
        self._data = None
        self._ok = False
        self._cache_ttl = cache_ttl

    async def get(self) -> dict:
        if not self._data or self._updated_at < time.time() - self._cache_ttl:
            self._ok, self._data = await self._fetch()
            self._updated_at = time.time()
        return self._ok, self._data

    @staticmethod
    async def _fetch() -> dict:
        async with AsyncClient() as ac:
            response = await ac.get(SCHEDULE_URL)
        if response.status_code != 200:
            return False, {"error": "Tripupdates API returned non-200", "details": response.content}
        return True, response.json()


schedule = Schedule()


@app.get("/{stop_id}")
async def stop_times(stop_id: str):
    ok, data = await schedule.get()
    if not ok:
        return {"error": "Tripupdates API returned non-200", "details": data}
    return {"arrivals": extact_arrival_times(data, stop_id)}


def extact_arrival_times(data: dict, stop_id: str) -> list[int]:
    arrivals = []
    for entity in data['entity']:
        for stop_time_update in entity['trip_update']['stop_time_update']:
            if stop_time_update['stop_id'] == stop_id:
                arrivals.append(stop_time_update['arrival']['time'])
    return arrivals

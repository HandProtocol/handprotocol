from __future__ import annotations

import os
import socket
import time
import traceback

from .optimizer import allocate
from .repository import Repository


TOPICS = ["food.need.created", "food.need.changed", "food.supply.created", "food.supply.changed", "food.match.requested", "food.commitment.cancelled", "food.incident.reported"]


def run_once(repository: Repository, worker: str) -> int:
    repository.release_expired_holds()
    jobs = repository.lease(worker, TOPICS)
    for job in jobs:
        try:
            with repository.connection() as connection:
                needs, supplies = repository.load_open(connection)
            candidates, allocations = allocate(needs, supplies)
            run_id = str(job["aggregate_id"]) if job["aggregate_type"] == "food_match_run" else repository.begin_match(job["topic"])
            repository.persist_match(run_id, worker, "wxl-mincost-v1", job["topic"], needs, supplies, candidates, allocations)
            repository.complete(job["id"], worker)
        except Exception as error:
            repository.complete(job["id"], worker, f"{type(error).__name__}: {error}")
            traceback.print_exc()
    return len(jobs)


def main() -> None:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise SystemExit("DATABASE_URL is required")
    repository = Repository(database_url)
    worker = f"matching:{socket.gethostname()}:{os.getpid()}"
    while True:
        count = run_once(repository, worker)
        time.sleep(2 if count else 10)


if __name__ == "__main__":
    main()

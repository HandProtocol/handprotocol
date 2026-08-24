from __future__ import annotations

import json
import hashlib
from contextlib import contextmanager
from datetime import datetime
from decimal import Decimal
from typing import Iterator

import psycopg
from psycopg.rows import dict_row

from .models import Need, Supply


class Repository:
    def __init__(self, database_url: str) -> None:
        self.database_url = database_url

    @contextmanager
    def connection(self) -> Iterator[psycopg.Connection]:
        with psycopg.connect(self.database_url, row_factory=dict_row) as connection:
            yield connection

    def lease(self, worker: str, topics: list[str], limit: int = 10) -> list[dict]:
        with self.connection() as connection:
            rows = connection.execute("select * from command.lease_food_outbox(%s,%s,%s,%s)", (worker, topics, limit, 60)).fetchall()
            connection.commit()
            return list(rows)

    def complete(self, outbox_id: int, worker: str, error: str | None = None) -> None:
        with self.connection() as connection:
            connection.execute("select command.complete_food_outbox(%s,%s,%s)", (outbox_id, worker, error))
            connection.commit()

    def begin_match(self, trigger_reason: str) -> str:
        with self.connection() as connection:
            row = connection.execute("select (command.begin_system_food_match_run(%s)).id", (trigger_reason,)).fetchone()
            connection.commit()
            return str(row["id"])

    def release_expired_holds(self) -> int:
        with self.connection() as connection:
            row = connection.execute("select command.release_expired_food_match_holds() as count").fetchone()
            connection.commit()
            return int(row["count"])

    def load_open(self, connection: psycopg.Connection) -> tuple[list[Need], list[Supply]]:
        need_rows = connection.execute("select * from command.food_needs where status='open' order by urgency desc,required_by").fetchall()
        supply_rows = connection.execute("select * from command.food_supplies where status='open' and expires_at>now() order by expires_at").fetchall()
        needs = [Need(
            id=str(row["id"]), lane=row["lane"], item_category=row["item_category"], quantity=Decimal(row["quantity"]), unit=row["unit"],
            allergens=frozenset(row["allergens"]), dietary_constraints=frozenset(row["dietary_constraints"]),
            substitutions=frozenset(item if isinstance(item, str) else item.get("item_category", "") for item in row["substitutions"]),
            urgency=row["urgency"], required_by=row["required_by"], window_start=row["window_start"], window_end=row["window_end"],
            fulfillment_method=row["fulfillment_method"], service_zone=row["service_zone"], subsidy_eligible=row["subsidy_eligible"],
            held_quantity=Decimal(row["held_quantity"]),committed_quantity=Decimal(row["committed_quantity"]),fulfilled_quantity=Decimal(row["fulfilled_quantity"]),
        ) for row in need_rows]
        supplies = [Supply(
            id=str(row["id"]), lane=row["lane"], item_category=row["item_category"], quantity=Decimal(row["quantity"]),
            held_quantity=Decimal(row["held_quantity"]), committed_quantity=Decimal(row["committed_quantity"]), unit=row["unit"],
            allergens=frozenset(row["allergens"]), dietary_tags=frozenset(row["dietary_tags"]), expires_at=row["expires_at"],
            available_from=row["available_from"], available_until=row["available_until"], fulfillment_method=row["fulfillment_method"],
            service_zone=row["service_zone"], source_approved=row["source_approved"], provider_eligible=row["provider_eligible"],
            preparation_class=row["preparation_class"], compliance_current=bool(row["compliance_evidence"].get("current", False)),fulfilled_quantity=Decimal(row["fulfilled_quantity"]),price_cents=row["price_cents"],
        ) for row in supply_rows]
        return needs, supplies

    def persist_match(self, run_id: str, worker: str, algorithm_version: str, trigger_reason: str, needs: list[Need], supplies: list[Supply], candidates: list, allocations: list) -> str:
        snapshot = {"need_ids": [item.id for item in needs], "supply_ids": [item.id for item in supplies]}
        snapshot_text = json.dumps(snapshot, sort_keys=True, separators=(",", ":"))
        candidate_payload = [{
            "need_id": item.need_id, "supply_id": item.supply_id, "eligible": item.eligible,
            "proposed_quantity": str(item.proposed_quantity) if item.proposed_quantity is not None else None,
            "hard_rule_results": item.hard_rule_results, "score_components": item.score_components,
            "explanation_codes": list(item.explanation_codes), "rejection_reasons": list(item.rejection_reasons), "rank": item.rank,
        } for item in candidates]
        allocation_payload = [{"need_id": item.need_id,"supply_id": item.supply_id,"quantity": str(item.quantity),"objective_cost": item.objective_cost} for item in allocations]
        objectives = {"priority": ["urgency","expiry","unmet_need","lateness","logistics","utilization","workload"],"trigger_reason":trigger_reason}
        with self.connection() as connection:
            connection.execute("select command.complete_food_match_run(%s,%s,%s,%s,%s,%s,%s,%s)",(
                run_id,worker,algorithm_version,json.dumps(snapshot),hashlib.sha256(snapshot_text.encode()).hexdigest(),json.dumps(objectives),json.dumps(candidate_payload),json.dumps(allocation_payload),
            ))
            connection.commit()
            return run_id

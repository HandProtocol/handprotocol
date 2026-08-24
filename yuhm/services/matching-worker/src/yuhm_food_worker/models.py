from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal


@dataclass(frozen=True)
class Need:
    id: str
    lane: str
    item_category: str
    quantity: Decimal
    unit: str
    allergens: frozenset[str]
    dietary_constraints: frozenset[str]
    substitutions: frozenset[str]
    urgency: int
    required_by: datetime
    window_start: datetime
    window_end: datetime
    fulfillment_method: str
    service_zone: str
    subsidy_eligible: bool = False
    held_quantity: Decimal = Decimal("0")
    committed_quantity: Decimal = Decimal("0")
    fulfilled_quantity: Decimal = Decimal("0")

    @property
    def available_quantity(self) -> Decimal:
        return self.quantity - self.held_quantity - self.committed_quantity - self.fulfilled_quantity


@dataclass(frozen=True)
class Supply:
    id: str
    lane: str
    item_category: str
    quantity: Decimal
    held_quantity: Decimal
    committed_quantity: Decimal
    unit: str
    allergens: frozenset[str]
    dietary_tags: frozenset[str]
    expires_at: datetime
    available_from: datetime
    available_until: datetime
    fulfillment_method: str
    service_zone: str
    source_approved: bool
    provider_eligible: bool
    preparation_class: str
    compliance_current: bool
    fulfilled_quantity: Decimal = Decimal("0")
    price_cents: int | None = None
    travel_minutes: int = 0
    travel_miles_tenths: int = 0

    @property
    def available_quantity(self) -> Decimal:
        return self.quantity - self.held_quantity - self.committed_quantity - self.fulfilled_quantity


@dataclass(frozen=True)
class Candidate:
    need_id: str
    supply_id: str
    eligible: bool
    proposed_quantity: Decimal | None
    hard_rule_results: dict[str, bool]
    explanation_codes: tuple[str, ...]
    rejection_reasons: tuple[str, ...]
    score_components: dict[str, int] = field(default_factory=dict)
    rank: int | None = None


@dataclass(frozen=True)
class Allocation:
    need_id: str
    supply_id: str
    quantity: Decimal
    objective_cost: int


@dataclass(frozen=True)
class RouteStop:
    id: str
    latitude_e6: int
    longitude_e6: int
    demand: int
    window_start_minutes: int
    window_end_minutes: int
    service_minutes: int


@dataclass(frozen=True)
class Vehicle:
    id: str
    capacity: int
    start_stop_id: str
    end_stop_id: str


@dataclass(frozen=True)
class PlannedRoute:
    vehicle_id: str
    stop_ids: tuple[str, ...]
    total_minutes: int

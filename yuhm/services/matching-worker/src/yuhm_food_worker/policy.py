from __future__ import annotations

from decimal import Decimal

from .models import Candidate, Need, Supply


def evaluate_edge(need: Need, supply: Supply) -> Candidate:
    checks = {
        "lane": need.lane == supply.lane,
        "item": need.item_category == supply.item_category or supply.item_category in need.substitutions,
        "allergen": not bool(need.allergens & supply.allergens),
        "dietary": need.dietary_constraints.issubset(supply.dietary_tags),
        "quantity": need.available_quantity > Decimal("0") and supply.available_quantity > Decimal("0"),
        "unit": need.unit == supply.unit,
        "availability": supply.available_from <= need.window_end and supply.available_until >= need.window_start,
        "expiry": supply.expires_at >= min(need.required_by, need.window_end),
        "location": need.service_zone == supply.service_zone,
        "fulfillment": need.fulfillment_method == "either" or supply.fulfillment_method == "either" or need.fulfillment_method == supply.fulfillment_method,
        "compliance": supply.compliance_current,
        "aid_source": need.lane != "aid" or supply.source_approved,
        "provider": need.lane != "marketplace" or supply.provider_eligible,
        "home_prepared": need.lane == "potluck" or supply.preparation_class != "home_prepared",
        "payment": need.lane != "marketplace" or supply.price_cents is not None,
    }
    rejection_map = {
        "lane": "rejected_lane",
        "item": "rejected_item",
        "allergen": "rejected_allergen",
        "dietary": "rejected_dietary_constraint",
        "quantity": "rejected_quantity",
        "unit": "rejected_unit",
        "availability": "rejected_availability",
        "expiry": "rejected_expiry_window",
        "location": "rejected_location_consent",
        "fulfillment": "rejected_transport",
        "compliance": "rejected_compliance_evidence",
        "aid_source": "rejected_source_class",
        "provider": "rejected_provider_class",
        "home_prepared": "rejected_preparation_class",
        "payment": "rejected_payment",
    }
    rejected = tuple(rejection_map[name] for name, passed in checks.items() if not passed)
    eligible = not rejected
    explanations: list[str] = []
    if eligible:
        explanations.append("eligible_exact_item" if need.item_category == supply.item_category else "eligible_substitution")
        explanations.extend(("ranked_urgency", "ranked_waste_avoidance", "ranked_route_efficiency"))
    quantity = min(need.available_quantity, supply.available_quantity) if eligible else None
    return Candidate(
        need_id=need.id,
        supply_id=supply.id,
        eligible=eligible,
        proposed_quantity=quantity,
        hard_rule_results={**checks, "all_passed": eligible},
        explanation_codes=tuple(explanations),
        rejection_reasons=rejected,
    )


def candidate_cost(need: Need, supply: Supply) -> tuple[int, dict[str, int]]:
    urgency = (4 - need.urgency) * 1_000_000_000
    expiry_minutes = max(0, int((supply.expires_at - need.window_start).total_seconds() // 60))
    waste = min(expiry_minutes, 100_000) * 1_000
    lateness_risk = max(0, supply.travel_minutes - int((need.window_end - need.window_start).total_seconds() // 60)) * 100
    logistics = supply.travel_minutes * 10 + supply.travel_miles_tenths
    components = {"urgency": urgency, "waste": waste, "lateness_risk": lateness_risk, "logistics": logistics}
    return sum(components.values()), components

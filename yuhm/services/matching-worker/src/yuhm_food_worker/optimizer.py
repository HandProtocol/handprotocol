from __future__ import annotations

from collections import defaultdict
from decimal import Decimal

from ortools.graph.python import min_cost_flow

from .models import Allocation, Candidate, Need, Supply
from .policy import candidate_cost, evaluate_edge

SCALE = 1_000


def _scaled(value: Decimal) -> int:
    return int(value * SCALE)


def allocate(needs: list[Need], supplies: list[Supply]) -> tuple[list[Candidate], list[Allocation]]:
    candidates: list[Candidate] = []
    eligible: list[tuple[Candidate, int, dict[str, int]]] = []
    needs_by_id = {need.id: need for need in needs}
    supplies_by_id = {supply.id: supply for supply in supplies}
    for need in needs:
        for supply in supplies:
            candidate = evaluate_edge(need, supply)
            candidates.append(candidate)
            if candidate.eligible:
                cost, components = candidate_cost(need, supply)
                eligible.append((candidate, cost, components))

    solver = min_cost_flow.SimpleMinCostFlow()
    source = 0
    next_node = 1
    supply_nodes = {item.id: next_node + index for index, item in enumerate(supplies)}
    next_node += len(supplies)
    need_nodes = {item.id: next_node + index for index, item in enumerate(needs)}
    sink = next_node + len(needs)

    total_demand = sum(_scaled(need.available_quantity) for need in needs)
    for supply in supplies:
        solver.add_arc_with_capacity_and_unit_cost(source, supply_nodes[supply.id], max(0, _scaled(supply.available_quantity)), 0)
    edge_arcs: dict[int, tuple[Candidate, int]] = {}
    for candidate, cost, _components in eligible:
        capacity = min(_scaled(needs_by_id[candidate.need_id].available_quantity), _scaled(supplies_by_id[candidate.supply_id].available_quantity))
        arc = solver.add_arc_with_capacity_and_unit_cost(supply_nodes[candidate.supply_id], need_nodes[candidate.need_id], capacity, cost)
        edge_arcs[arc] = (candidate, cost)
    unmet_penalty = 10_000_000_000
    for need in needs:
        solver.add_arc_with_capacity_and_unit_cost(source, need_nodes[need.id], _scaled(need.available_quantity), unmet_penalty + need.urgency * 1_000_000_000)
        solver.add_arc_with_capacity_and_unit_cost(need_nodes[need.id], sink, _scaled(need.available_quantity), 0)
    solver.set_node_supply(source, total_demand)
    solver.set_node_supply(sink, -total_demand)
    status = solver.solve()
    if status != solver.OPTIMAL:
        raise RuntimeError(f"Allocation optimization failed with status {status}")

    allocations: list[Allocation] = []
    ranks: dict[str, int] = defaultdict(int)
    candidate_updates: dict[tuple[str, str], Candidate] = {}
    for arc, (candidate, cost) in edge_arcs.items():
        flow = solver.flow(arc)
        if flow <= 0:
            continue
        ranks[candidate.need_id] += 1
        _raw_cost, components = candidate_cost(needs_by_id[candidate.need_id], supplies_by_id[candidate.supply_id])
        candidate_updates[(candidate.need_id, candidate.supply_id)] = Candidate(
            **{**candidate.__dict__, "score_components": components, "rank": ranks[candidate.need_id]}
        )
        allocations.append(Allocation(candidate.need_id, candidate.supply_id, Decimal(flow) / SCALE, cost))
    final_candidates = [candidate_updates.get((candidate.need_id, candidate.supply_id), candidate) for candidate in candidates]
    return final_candidates, allocations

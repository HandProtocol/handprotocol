from __future__ import annotations

from math import asin, cos, radians, sin, sqrt

from ortools.constraint_solver import pywrapcp, routing_enums_pb2

from .models import PlannedRoute, RouteStop, Vehicle


def _minutes(a: RouteStop, b: RouteStop) -> int:
    lat1, lon1 = radians(a.latitude_e6 / 1_000_000), radians(a.longitude_e6 / 1_000_000)
    lat2, lon2 = radians(b.latitude_e6 / 1_000_000), radians(b.longitude_e6 / 1_000_000)
    dlat, dlon = lat2 - lat1, lon2 - lon1
    value = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    miles = 3958.8 * 2 * asin(sqrt(value))
    return max(1, round(miles / 22 * 60))


def plan_routes(stops: list[RouteStop], vehicles: list[Vehicle]) -> list[PlannedRoute]:
    if not stops or not vehicles:
        return []
    stop_index = {stop.id: index for index, stop in enumerate(stops)}
    starts = [stop_index[vehicle.start_stop_id] for vehicle in vehicles]
    ends = [stop_index[vehicle.end_stop_id] for vehicle in vehicles]
    manager = pywrapcp.RoutingIndexManager(len(stops), len(vehicles), starts, ends)
    routing = pywrapcp.RoutingModel(manager)

    def travel(from_index: int, to_index: int) -> int:
        source = stops[manager.IndexToNode(from_index)]
        target = stops[manager.IndexToNode(to_index)]
        return _minutes(source, target) + source.service_minutes

    transit = routing.RegisterTransitCallback(travel)
    routing.SetArcCostEvaluatorOfAllVehicles(transit)
    routing.AddDimension(transit, 30, 24 * 60, False, "Time")
    time = routing.GetDimensionOrDie("Time")
    for index, stop in enumerate(stops):
        node = manager.NodeToIndex(index)
        if node >= 0:
            time.CumulVar(node).SetRange(stop.window_start_minutes, stop.window_end_minutes)

    demand = routing.RegisterUnaryTransitCallback(lambda index: stops[manager.IndexToNode(index)].demand)
    routing.AddDimensionWithVehicleCapacity(demand, 0, [vehicle.capacity for vehicle in vehicles], True, "Capacity")
    params = pywrapcp.DefaultRoutingSearchParameters()
    params.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PARALLEL_CHEAPEST_INSERTION
    params.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    params.time_limit.seconds = 10
    solution = routing.SolveWithParameters(params)
    if solution is None:
        raise RuntimeError("No feasible route satisfies capacity and time windows")

    result: list[PlannedRoute] = []
    for vehicle_index, vehicle in enumerate(vehicles):
        index = routing.Start(vehicle_index)
        ids: list[str] = []
        while not routing.IsEnd(index):
            ids.append(stops[manager.IndexToNode(index)].id)
            index = solution.Value(routing.NextVar(index))
        ids.append(stops[manager.IndexToNode(index)].id)
        result.append(PlannedRoute(vehicle.id, tuple(ids), solution.Value(time.CumulVar(index))))
    return result

import importlib.util
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1] / "src"))

ORTOOLS = importlib.util.find_spec("ortools") is not None
if ORTOOLS:
    from wxl_food_worker.models import RouteStop, Vehicle
    from wxl_food_worker.routing import plan_routes


@unittest.skipUnless(ORTOOLS, "OR-Tools is not installed in the current interpreter")
class RoutingTests(unittest.TestCase):
    def test_route_respects_capacity_and_returns_to_hub(self):
        stops = [
            RouteStop("hub",30267000,-97743000,0,0,600,0),
            RouteStop("pickup",30270000,-97740000,2,0,300,5),
            RouteStop("dropoff",30273000,-97737000,2,0,400,5),
        ]
        routes = plan_routes(stops,[Vehicle("vehicle",5,"hub","hub")])
        self.assertEqual(routes[0].stop_ids[0],"hub")
        self.assertEqual(routes[0].stop_ids[-1],"hub")
        self.assertIn("pickup",routes[0].stop_ids)
        self.assertIn("dropoff",routes[0].stop_ids)


if __name__ == "__main__":
    unittest.main()

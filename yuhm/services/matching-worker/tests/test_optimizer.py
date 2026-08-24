import importlib.util
import sys
import unittest
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1] / "src"))

ORTOOLS = importlib.util.find_spec("ortools") is not None
if ORTOOLS:
    from yuhm_food_worker.models import Need, Supply
    from yuhm_food_worker.optimizer import allocate


NOW = datetime(2026, 7, 18, 12, tzinfo=timezone.utc)


@unittest.skipUnless(ORTOOLS, "OR-Tools is not installed in the current interpreter")
class OptimizerTests(unittest.TestCase):
    def make_need(self, identifier, urgency, quantity="5"):
        return Need(identifier,"aid","produce",Decimal(quantity),"lb",frozenset(),frozenset(),frozenset(),urgency,NOW+timedelta(hours=4),NOW,NOW+timedelta(hours=5),"either","78702")

    def make_supply(self, identifier, quantity="5"):
        return Supply(identifier,"aid","produce",Decimal(quantity),Decimal("0"),Decimal("0"),"lb",frozenset(),frozenset(),NOW+timedelta(hours=8),NOW,NOW+timedelta(hours=6),"pickup","78702",True,False,"whole",True)

    def test_scarce_supply_goes_to_highest_urgency(self):
        _candidates, allocations = allocate([self.make_need("urgent",4),self.make_need("routine",1)],[self.make_supply("scarce")])
        self.assertEqual([(item.need_id,item.quantity) for item in allocations],[('urgent',Decimal('5'))])

    def test_split_fulfillment_can_use_two_supplies(self):
        _candidates, allocations = allocate([self.make_need("need",4,"8")],[self.make_supply("a","4"),self.make_supply("b","4")])
        self.assertEqual(sum((item.quantity for item in allocations),Decimal("0")),Decimal("8"))


if __name__ == "__main__":
    unittest.main()

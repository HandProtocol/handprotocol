// Driver runs for SolarPunk Summit 2026 artist transport.
// Passenger names stay off this list on purpose: the page is public.
// start/end = how long the run keeps a driver busy, including the drive back
// (camp ↔ AUS is about 40 min each way).
export const SLOTS = [
  { id: "1007-a", date: "2026-10-07", dir: "in", from: "AUS", to: "Camp", pickup: "1:58 PM", start: "13:45", end: "15:30", riders: 1, note: "Flight lands 1:58 PM. One driver can also take the 4:49 PM pickup." },
  { id: "1007-b", date: "2026-10-07", dir: "in", from: "AUS", to: "Camp", pickup: "4:49 PM", start: "16:30", end: "18:30", riders: 1, note: "International arrival. Meet at arrivals." },
  { id: "1008-a", date: "2026-10-08", dir: "in", from: "AUS", to: "Camp", pickup: "Afternoon (TBD)", start: "12:00", end: "17:00", riders: 2, note: "Landing time not confirmed yet." },
  { id: "1008-b", date: "2026-10-08", dir: "in", from: "AUS", to: "Camp", pickup: "8:20 PM", start: "20:00", end: "22:00", riders: 2, note: "Flight lands 8:20 PM." },
  { id: "1009-a", date: "2026-10-09", dir: "in", from: "Downtown Austin (near UT)", to: "Camp", pickup: "About 12 PM", start: "11:15", end: "13:30", riders: 1, note: "Not an airport run. Time can shift a couple of hours if paired with an airport run." },
  { id: "1009-b", date: "2026-10-09", dir: "in", from: "AUS", to: "Camp", pickup: "Evening (TBD)", start: "17:00", end: "22:00", riders: 1, note: "Landing time not confirmed yet." },
  { id: "1010-a", date: "2026-10-10", dir: "out", from: "Camp", to: "AUS", pickup: "About 6 AM", start: "05:45", end: "07:30", riders: 2, note: "Flight departs 8:26 AM." },
  { id: "1010-b", date: "2026-10-10", dir: "in", from: "AUS", to: "Camp", pickup: "12:20 PM", start: "11:30", end: "13:45", riders: 1, note: "Flight lands 12:20 PM." },
  { id: "1010-c", date: "2026-10-10", dir: "out", from: "Camp", to: "AUS", pickup: "About 2–3 PM", start: "14:00", end: "16:30", riders: 1, note: "Flight not confirmed yet; time may move." },
  { id: "1011-a", date: "2026-10-11", dir: "out", from: "Camp", to: "AUS", pickup: "About 7:45 AM", start: "07:45", end: "09:30", riders: 1, note: "Must reach AUS by 9:00 AM." },
  { id: "1012-a", date: "2026-10-12", dir: "out", from: "Camp", to: "AUS", pickup: "Morning (TBD)", start: "08:00", end: "12:00", riders: 1, note: "Flight time not confirmed yet." },
  { id: "1012-b", date: "2026-10-12", dir: "out", from: "Camp", to: "AUS", pickup: "About 9 AM", start: "09:00", end: "10:45", riders: 1, note: "Flight time not confirmed yet." },
  { id: "1012-c", date: "2026-10-12", dir: "out", from: "Camp", to: "AWKN Ranch, Austin", pickup: "About 10 AM", start: "10:00", end: "11:45", riders: 1, note: "Drop-off in Austin, not the airport." },
  { id: "1012-d", date: "2026-10-12", dir: "out", from: "Camp", to: "AUS", pickup: "12 PM (confirmed)", start: "12:00", end: "13:45", riders: 2, note: "Pickup time confirmed." },
  { id: "1013-a", date: "2026-10-13", dir: "out", from: "Camp", to: "AUS", pickup: "About 5 AM", start: "05:00", end: "06:45", riders: 1, note: "Flight departs 7:15 AM. Earliest run of the event." },
];

export const SLOT_IDS = new Set(SLOTS.map((s) => s.id));

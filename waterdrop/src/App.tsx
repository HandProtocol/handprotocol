import { Suspense, lazy, useEffect, useState } from 'react';
import { AppBar } from '@/components/ui';
import { useStore } from '@/store';
import RiverMap from '@/features/map/RiverMap';
import { useConditions, CorridorConditionsPill } from '@/features/conditions';
import {
  useObservationsLoader,
  CrewControls,
  CrewGate,
  isUnlocked,
} from '@/features/crew';

// The crew compose form is only needed once logging starts.
const ComposePanel = lazy(() =>
  import('@/features/crew/ComposePanel').then((m) => ({ default: m.ComposePanel })),
);
import { Wordmark } from '@/components/Wordmark';
import { CrewToggle } from '@/components/CrewToggle';
import { DetailSheet } from '@/components/DetailSheet';
import { WhatsNew } from '@/components/WhatsNew';
import { FeedbackButton, FeedbackModal, flushFeedbackQueue } from '@/features/feedback';
import './App.css';

export default function App() {
  // Mount the two singletons that hydrate the shared store.
  useConditions(); // live USGS readings -> store.gaugeReadings
  useObservationsLoader(); // local observations -> store.observations

  const crewMode = useStore((s) => s.crewMode);
  const setCrewMode = useStore((s) => s.setCrewMode);
  const compose = useStore((s) => s.compose);
  const feedbackOpen = useStore((s) => s.feedbackOpen);
  const setFeedbackOpen = useStore((s) => s.setFeedbackOpen);
  const [gateOpen, setGateOpen] = useState(false);

  // Retry any feedback that was queued while offline.
  useEffect(() => {
    void flushFeedbackQueue();
    const onOnline = () => void flushFeedbackQueue();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  const enterCrew = () => {
    if (isUnlocked()) setCrewMode(true);
    else setGateOpen(true);
  };

  return (
    <>
      <div className="wd-map-root">
        <RiverMap />
      </div>

      <AppBar
        left={<Wordmark />}
        right={
          <div className="wd-appbar-actions">
            <CorridorConditionsPill />
            <FeedbackButton onClick={() => setFeedbackOpen(true)} />
            {!crewMode && <CrewToggle onOpen={enterCrew} />}
          </div>
        }
      />

      <DetailSheet />
      <WhatsNew />

      {crewMode && <CrewControls />}
      {compose && (
        <Suspense fallback={null}>
          <ComposePanel />
        </Suspense>
      )}

      <CrewGate open={gateOpen} onClose={() => setGateOpen(false)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  );
}

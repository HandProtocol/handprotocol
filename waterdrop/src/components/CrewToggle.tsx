import { Shield } from 'lucide-react';
import { IconButton } from '@/components/ui';

/** App-bar affordance to enter crew mode. Opens the passcode gate, or jumps
    straight in if already unlocked (handled by the parent). */
export function CrewToggle({ onOpen }: { onOpen: () => void }) {
  return (
    <IconButton label="Crew sign in" variant="ghost" onClick={onOpen}>
      <Shield size={20} />
    </IconButton>
  );
}

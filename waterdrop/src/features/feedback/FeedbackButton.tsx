import { MessageSquareText } from 'lucide-react';
import { IconButton } from '@/components/ui';

/** App-bar launcher for the feedback modal. */
export function FeedbackButton({ onClick }: { onClick: () => void }) {
  return (
    <IconButton label="Send feedback" variant="ghost" onClick={onClick}>
      <MessageSquareText size={20} />
    </IconButton>
  );
}

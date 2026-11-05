import { CallConsole } from "@/components/calls/call-console";
import { LoaderSplash } from "@/components/loader-splash";

export const dynamic = "force-dynamic";

export default function CallsPage() {
  return (
    <>
      <CallConsole standalone />
      <LoaderSplash handoffTo={null} title="HAND voice operations boot screen" />
    </>
  );
}

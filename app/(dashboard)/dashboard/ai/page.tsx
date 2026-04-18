import { AICoachModule } from "@/components/coach/AICoachModule";

export default function AICoachPage() {
  return (
    <div className="h-[calc(100dvh-var(--dashboard-top-offset-mobile,6.25rem))] overflow-hidden md:h-[calc(100dvh-var(--dashboard-top-offset-desktop,7rem))]">
      <AICoachModule />
    </div>
  );
}

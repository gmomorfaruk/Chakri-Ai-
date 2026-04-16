import { sectionTabs } from "./constants";

export function SectionTabs() {
  return (
    <div className="flex flex-wrap gap-2">
      {sectionTabs.map((tab) => {
        const stateClasses =
          tab.state === "done"
            ? "bg-[var(--green-dim)] border-[#1a4a30] text-[var(--green)]"
            : tab.state === "partial"
              ? "bg-[var(--amber-dim)] border-[var(--amber)]/30 text-[var(--amber)]"
              : "bg-[var(--bg3)] border-[var(--border2)] text-[var(--text2)]";

        return (
          <button
            key={tab.label}
            className={`mono btn rounded-[14px] border px-3 py-[6px] text-[11px] font-medium ${stateClasses}`}
          >
            {tab.state === "done" ? "✓ " : tab.state === "partial" ? "⊙ " : ""}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

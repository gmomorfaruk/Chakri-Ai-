import { sectionStatuses } from "./constants";

export function CompletionStatusGrid() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {sectionStatuses.map((item) => {
        const palette =
          item.state === "done"
            ? { bg: "var(--green-dim)", fg: "var(--green)", icon: "✓" }
            : item.state === "partial"
              ? { bg: "var(--amber-dim)", fg: "var(--amber)", icon: "⊙" }
              : { bg: "var(--red-dim)", fg: "var(--red)", icon: "○" };

        return (
          <div key={item.label} className="card flex items-center justify-between rounded-[8px] border border-[var(--border)] bg-[var(--bg3)] px-3 py-3">
            <div className="flex items-center gap-3">
              <div
                className="flex h-[26px] w-[22px] items-center justify-center rounded-[7px] text-[13px]"
                style={{ background: palette.bg, color: palette.fg }}
              >
                {palette.icon}
              </div>
              <div className="text-[11px] font-medium text-[var(--text2)]">{item.label}</div>
            </div>
            <span className="mono text-[11px] font-semibold" style={{ color: palette.fg }}>
              {item.state === "done" ? "Done" : item.state === "partial" ? "Partial" : "Empty"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

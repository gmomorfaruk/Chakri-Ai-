import { NavSection, ProfileDraft } from "./types";

interface SidebarProps {
  profileDraft: ProfileDraft;
  navSections: NavSection[];
}

export function Sidebar({ profileDraft, navSections }: SidebarProps) {
  return (
    <aside className="relative flex h-full w-[220px] flex-col justify-between border-r border-[var(--border)] bg-[var(--bg2)] px-3 py-3">
      <div className="pointer-events-none absolute right-0 top-0 h-full w-[1px] bg-gradient-to-b from-transparent via-[var(--blue-dim)] to-transparent opacity-70" />

      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg border border-[var(--border3)] bg-[var(--bg3)] px-3 py-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border3)]"
            style={{ background: "linear-gradient(140deg, #1a3a6a, #0d1e3d)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="1.4">
              <path d="M12 2 4 7v10l8 5 8-5V7z" />
              <circle cx="12" cy="12" r="2" fill="var(--blue)" />
            </svg>
          </div>
          <div>
            <div className="heading text-[14px] font-semibold text-[var(--text)]">Chakri AI</div>
            <div className="mono text-[9px] uppercase tracking-[0.5px] text-[var(--text3)]">career platform</div>
          </div>
        </div>

        <nav className="space-y-5 px-1">
          {navSections.map((section) => (
            <div key={section.label} className="space-y-2">
              <div className="mono text-[9px] uppercase tracking-[1px] text-[var(--text3)]">{section.label}</div>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <div
                    key={item.name}
                    className={`relative flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left transition-colors ${
                      item.active
                        ? "bg-[var(--blue-dim)] border border-[#1a3360] text-[var(--blue-bright)]"
                        : "border border-transparent text-[var(--text2)] hover:bg-[var(--bg3)]"
                    }`}
                  >
                    <span className={`text-[13px] ${item.active ? "text-[var(--blue)]" : "text-[var(--text3)]"}`}>{item.icon}</span>
                    <span className="text-[12px] font-medium leading-none">{item.name}</span>
                    {item.dot && <span className="absolute right-2 h-[5px] w-[5px] rounded-full bg-[var(--blue)]" />}
                    {item.badge && (
                      <span className="mono absolute right-2 rounded-[4px] border border-[var(--border2)] bg-[var(--bg4)] px-[6px] py-[2px] text-[9px] text-[var(--text3)]">
                        {item.badge}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className="card flex items-center gap-3 rounded-[10px] border border-[var(--border2)] px-3 py-2">
        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-lg" style={{ background: "linear-gradient(140deg, #1a3a6a, #0d1e3d)" }}>
          <span className="mono text-[11px] font-bold text-[var(--blue-bright)]">
            {(profileDraft.username || "ai").slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div className="flex flex-col">
          <div className="text-[12px] font-semibold text-[var(--text)]">{profileDraft.username || "user"}</div>
          <div className="mono text-[10px] text-[var(--text3)]">free plan</div>
        </div>
        <span className="ml-auto h-[7px] w-[7px] rounded-full bg-[var(--green)]" />
      </div>
    </aside>
  );
}

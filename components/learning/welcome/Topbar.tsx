export function Topbar() {
  return (
    <header className="flex h-[52px] items-center justify-between border-b border-[var(--border)] bg-[var(--bg2)] px-4 md:px-5">
      <div className="flex items-center gap-3 text-[12px] text-[var(--text3)]">
        <div className="flex items-center gap-2">
          <span className="cursor-default text-[var(--text3)]">Chakri AI</span>
          <span className="text-[var(--border3)]">/</span>
          <span className="text-[var(--text)] font-medium">Profile Builder</span>
        </div>
        <div className="pill mono hidden sm:flex items-center gap-2 border border-[#1a4a30] bg-[var(--green-dim)] px-3 py-[4px] text-[11px] text-[var(--green)]">
          <span className="h-[6px] w-[6px] rounded-full bg-[var(--green)] session-dot" />
          active session
        </div>
      </div>

      <div className="flex items-center gap-2 text-[11px]">
        <button className="btn flex items-center gap-1 rounded-[7px] border border-[var(--border2)] bg-[var(--bg3)] px-3 py-[6px] text-[var(--text2)]">
          EN ▾
        </button>
        <button className="btn flex h-[30px] w-[30px] items-center justify-center rounded-[7px] border border-[var(--border2)] bg-[var(--bg3)] text-[var(--text2)]">
          ☾
        </button>
        <button className="btn rounded-[7px] border border-[#3a1a1a] bg-[var(--red-dim)] px-3 py-[6px] text-[var(--red)]">
          Sign Out ↗
        </button>
      </div>
    </header>
  );
}

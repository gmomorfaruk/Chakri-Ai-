import { ProfileDraft } from "./types";

interface ProfileBasicsCardProps {
  id?: string;
  profileDraft: ProfileDraft;
  onChange: (field: keyof ProfileDraft, value: string) => void;
}

const fields: { label: string; key: keyof ProfileDraft; placeholder: string }[] = [
  { label: "Username", key: "username", placeholder: "faarukh181" },
  { label: "Full name", key: "fullName", placeholder: "Enter your full name" },
  { label: "Tagline", key: "tagline", placeholder: "Backend engineer who loves clean APIs" },
  { label: "Location", key: "location", placeholder: "Dhaka, Bangladesh" },
  { label: "Portfolio URL", key: "portfolioUrl", placeholder: "https://chakri.ai/u/username" },
  { label: "Preferred roles", key: "roles", placeholder: "Frontend · Product Engineer" },
];

export function ProfileBasicsCard({ id, profileDraft, onChange }: ProfileBasicsCardProps) {
  return (
    <div id={id} className="card divide-y divide-[var(--border)]">
      <div className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-[7px] border border-[var(--border2)] bg-[var(--bg3)] text-[var(--blue)]">▢</div>
          <div>
            <div className="text-[13px] font-semibold text-[var(--text)]">Profile Basics</div>
            <div className="text-[11px] text-[var(--text3)]">Public profile details and portfolio visibility</div>
          </div>
        </div>
        <button className="btn rounded-[8px] border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-[11px] text-[var(--text2)]">
          Edit
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 px-5 py-5 md:grid-cols-2">
        {fields.map((field) => (
          <label key={field.key} className="space-y-2">
            <div className="mono text-[10px] font-semibold uppercase tracking-[0.5px] text-[var(--text3)]">{field.label}</div>
            <input
              aria-label={field.label}
              value={profileDraft[field.key] ?? ""}
              onChange={(e) => onChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              className="w-full rounded-[8px] border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-[12px] text-[var(--text)] outline-none transition-colors focus:border-[var(--blue)]"
            />
          </label>
        ))}
        <label className="md:col-span-2">
          <div className="mono text-[10px] font-semibold uppercase tracking-[0.5px] text-[var(--text3)]">Summary</div>
          <textarea
            aria-label="Summary"
            value={profileDraft.summary}
            onChange={(e) => onChange("summary", e.target.value)}
            placeholder="Highlight domain strengths, industry focus, and what you want next."
            className="mt-2 h-[90px] w-full rounded-[8px] border border-[var(--border2)] bg-[var(--bg3)] px-3 py-2 text-[12px] text-[var(--text)] outline-none transition-colors focus:border-[var(--blue)]"
          />
        </label>
      </div>
    </div>
  );
}

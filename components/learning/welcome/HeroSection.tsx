import { ProfileDraft } from "./types";
import { topicMeta } from "./constants";
import { LearningTopic } from "./types";

interface HeroSectionProps {
  profileDraft: ProfileDraft;
  completionPct: number;
  topic: LearningTopic;
  onEditProfile?: () => void;
}

export function HeroSection({ profileDraft, completionPct, topic, onEditProfile }: HeroSectionProps) {
  const meta = topicMeta[topic];

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-[1px] text-[var(--blue)] mono">
          <span className="h-[1px] w-5 bg-[var(--blue-dim)]" />
          Profile Builder
        </div>
        <div className="heading text-[24px] md:text-[26px] font-extrabold leading-[1.1] text-[var(--text)]">
          Build Your <span className="text-[var(--blue)]">Career Profile</span>
        </div>
        <p className="max-w-2xl text-[12px] leading-relaxed text-[var(--text3)]">
          Structured sections for portfolio visibility and AI-powered job matching. Tailored for Bangladesh roles and hiring patterns.
        </p>
        <div className="flex flex-wrap items-center gap-2 text-[10px] mono text-[var(--text3)]">
          <span className="uppercase tracking-[1px]">portfolio →</span>
          <button className="border-b border-[var(--blue-dim)] text-[var(--blue)]" type="button">
            {profileDraft.portfolioUrl}
          </button>
        </div>
      </div>

      <div className="flex flex-row items-end gap-3 md:flex-col md:items-end">
        <div className="text-right">
          <div className="mono text-[16px] font-semibold text-[var(--blue)]">{completionPct}%</div>
          <div className="mono text-[10px] uppercase tracking-[0.8px] text-[var(--text3)]">profile complete</div>
        </div>
        <div className="w-[140px] md:w-[160px] rounded-[2px] bg-[var(--bg4)]">
          <div
            className="h-[4px] rounded-[2px] bg-gradient-to-r from-[var(--blue2)] to-[var(--cyan)] transition-[width] duration-700 ease-out"
            style={{ width: `${completionPct}%` }}
          />
        </div>
        <button
          type="button"
          onClick={onEditProfile}
          className="btn rounded-[8px] bg-[var(--blue2)] px-4 py-2 text-[12px] font-medium text-white"
        >
          Edit Profile
        </button>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";

import { CompletionStatusGrid } from "./welcome/CompletionStatusGrid";
import { HeroSection } from "./welcome/HeroSection";
import { ProfileBasicsCard } from "./welcome/ProfileBasicsCard";
import { SectionTabs } from "./welcome/SectionTabs";
import { Sidebar } from "./welcome/Sidebar";
import { SuggestionsCard } from "./welcome/SuggestionsCard";
import { Topbar } from "./welcome/Topbar";
import { NAV_SECTIONS, defaultProfileDraft, topicMeta, topicPrompts } from "./welcome/constants";
import { LearningWelcomeStateProps, NavSection, ProfileDraft } from "./welcome/types";

export function LearningWelcomeState({ topic, onSuggestedQuestion, variant = "standalone" }: LearningWelcomeStateProps) {
  const prompts = useMemo(() => topicPrompts[topic], [topic]);
  const meta = topicMeta[topic];
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>({ ...defaultProfileDraft });
  const isEmbedded = variant === "embedded";

  const navSections: NavSection[] = useMemo(
    () =>
      NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.map((item) => ({ ...item, active: item.name === "Profile" })),
      })),
    [],
  );

  const completionPct = 71;

  const content = (
    <div className="space-y-6">
      <HeroSection
        profileDraft={profileDraft}
        completionPct={completionPct}
        topic={topic}
        onEditProfile={() => {
          // TODO: replace with navigation to profile edit when available
          const el = document?.getElementById("profile-basics-card");
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
      />

      <div className="flex items-center gap-3 text-[10px] mono uppercase tracking-[0.8px] text-[var(--text3)]">
        <span>Overview</span>
        <div className="h-px flex-1 border-b border-[var(--border)]" />
      </div>

      <CompletionStatusGrid />

      <div className="relative overflow-hidden rounded-[8px] border border-[#1a3360] bg-gradient-to-r from-[var(--blue-dim)] to-[var(--purple-dim)] px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="text-[var(--blue)]">⟡</div>
          <p className="text-[11px] leading-5 text-[var(--text2)]">
            Add <span className="font-semibold text-[var(--blue-bright)]">2 portfolio projects</span> to increase your Smart Match score. Filling{" "}
            <span className="font-semibold text-[var(--green)]">Experience</span> to 100% unlocks targeted interview prep.
          </p>
        </div>
      </div>

      <SectionTabs />

      <ProfileBasicsCard
        id="profile-basics-card"
        profileDraft={profileDraft}
        onChange={(field, value) => setProfileDraft((prev) => ({ ...prev, [field]: value }))}
      />

      <SuggestionsCard prompts={prompts} title={meta.title} blurb={meta.blurb} onSuggestedQuestion={onSuggestedQuestion} />
    </div>
  );

  if (isEmbedded) {
    return (
      <div className="w-full max-w-3xl space-y-4 text-[var(--text)]">
        <div className="flex flex-col gap-2">
          <div className="text-[11px] uppercase tracking-[0.8px] text-[var(--text3)] mono">Starter Prompts</div>
          <div className="text-[18px] font-semibold text-[var(--text)]">{meta.title}</div>
          <p className="text-[12px] leading-relaxed text-[var(--text3)]">{meta.blurb}</p>
        </div>
        <SuggestionsCard prompts={prompts} title={meta.title} blurb={meta.blurb} onSuggestedQuestion={onSuggestedQuestion} />
      </div>
    );
  }

  return (
    <div className="chakri-shell min-h-screen">
      <div className="flex h-screen bg-[var(--bg)] text-[var(--text)]">
        <Sidebar profileDraft={profileDraft} navSections={navSections} />

        <div className="flex min-h-screen flex-1 flex-col overflow-hidden">
          <Topbar />

          <main className="flex-1 overflow-y-auto bg-[var(--bg)] px-5 pb-10 pt-7 sm:px-7">
            <div className="mx-auto w-full max-w-[960px] space-y-6">{content}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

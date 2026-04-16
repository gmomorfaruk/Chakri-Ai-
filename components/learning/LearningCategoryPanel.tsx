"use client";

import { useI18n } from "@/components/providers/I18nProvider";

type LearningTopic = "general" | "it" | "govt" | "bank" | "ngo";

interface LearningCategoryPanelProps {
  topic: LearningTopic;
  onTopicChange: (topic: LearningTopic) => void;
}

const categories: Array<{
  id: LearningTopic;
  icon: string;
  label: string;
  description: string;
}> = [
  { id: "general", icon: "🎯", label: "General", description: "Career guidance" },
  { id: "it", icon: "💻", label: "IT & Tech", description: "Software roles" },
  { id: "govt", icon: "🏛️", label: "Government", description: "Govt & BCS" },
  { id: "bank", icon: "🏦", label: "Banking", description: "Finance sector" },
  { id: "ngo", icon: "🤝", label: "NGO", description: "Dev sector" },
];

export function LearningCategoryPanel({
  topic,
  onTopicChange,
}: LearningCategoryPanelProps) {
  const { t } = useI18n();

  return (
    <div className="hidden h-full min-h-0 w-[220px] flex-col border-r border-[#1f2730] bg-[#0d1117] md:flex">
      {/* Header */}
      <div className="border-b border-[#1f2730] px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🎓</div>
          <div>
            <h2 className="font-bold text-[#e6edf3] text-sm">
              {t("learningCoach") || "Career Coach AI"}
            </h2>
            <p className="text-xs text-[#8b949e]">Career mentor</p>
          </div>
        </div>
      </div>

      {/* Categories */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1 text-[13px]">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8b949e] px-2 mb-2">
          {t("coachLearnTopic") || "Focus Area"}
        </p>

        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onTopicChange(cat.id)}
            className={`w-full rounded-md px-3 py-2.5 text-left transition-colors flex items-center gap-2 border ${
              topic === cat.id
                ? "border-[#388bfd] bg-[#0f1724] text-[#e6edf3]"
                : "border-transparent text-[#c9d1d9] hover:border-[#30363d] hover:bg-[#111827]"
            }`}
          >
            <span className="text-lg">{cat.icon}</span>
            <div className="leading-tight">
              <div className="font-semibold">{cat.label}</div>
              <div className="text-[11px] text-[#8b949e]">{cat.description}</div>
            </div>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-[#1f2730] px-3 py-3 text-[12px] text-[#8b949e]">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Voice (beta) available
        </div>
      </div>
    </div>
  );
}

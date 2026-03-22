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
    <div className="hidden h-full min-h-0 w-64 flex-col border-r border-white/5 bg-gradient-to-b from-[#161b22] to-[#0d1117] shadow-xl md:flex">
      {/* Header */}
      <div className="border-b border-white/5 px-4 py-6">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🎓</div>
          <div>
            <h2 className="font-bold text-white text-sm">
              {t("learningCoach") || "Learning AI"}
            </h2>
            <p className="text-xs text-gray-500">Your mentor guide</p>
          </div>
        </div>
      </div>

      {/* Categories */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 px-2 mb-3">
          {t("coachLearnTopic") || "Focus Area"}
        </p>

        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onTopicChange(cat.id)}
            className={`w-full rounded-lg px-3 py-3 text-left transition-all duration-200 relative overflow-hidden group ${
              topic === cat.id
                ? "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/40"
                : "bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20"
            }`}
          >
            {/* Glow effect on active */}
            {topic === cat.id && (
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-transparent to-cyan-500/20 blur-xl opacity-60 group-hover:opacity-100 transition-opacity" />
            )}

            <div className="relative">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{cat.icon}</span>
                <span
                  className={`font-semibold text-sm ${
                    topic === cat.id ? "text-blue-300" : "text-gray-300"
                  }`}
                >
                  {cat.label}
                </span>
              </div>
              <p
                className={`text-xs leading-tight ${
                  topic === cat.id ? "text-blue-200/70" : "text-gray-500"
                }`}
              >
                {cat.description}
              </p>
            </div>
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/5 px-3 py-3 text-xs text-gray-600 bg-black/20">
        <p>💡 Switch category to change guidance context</p>
      </div>
    </div>
  );
}

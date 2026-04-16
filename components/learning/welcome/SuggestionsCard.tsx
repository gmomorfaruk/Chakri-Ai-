import { AnimatePresence, motion } from "framer-motion";

interface SuggestionsCardProps {
  prompts: string[];
  title: string;
  blurb: string;
  onSuggestedQuestion: (question: string) => void;
}

export function SuggestionsCard({ prompts, title, blurb, onSuggestedQuestion }: SuggestionsCardProps) {
  return (
    <div className="card space-y-4 px-5 py-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[13px] font-semibold text-[var(--text)]">Smart Suggestions</div>
          <div className="text-[11px] text-[var(--text3)]">
            {title} · {blurb}
          </div>
        </div>
        <div className="pill mono border border-[var(--border2)] bg-[var(--bg3)] px-3 py-[6px] text-[10px] uppercase tracking-[1px] text-[var(--text3)]">
          Send to AI
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <AnimatePresence>
          {prompts.map((prompt) => (
            <motion.button
              key={prompt}
              layout
              whileHover={{ y: -2, scale: 1.005 }}
              whileTap={{ scale: 0.995 }}
              onClick={() => onSuggestedQuestion(prompt)}
              className="group h-full rounded-[10px] border border-[var(--border)] bg-[var(--bg3)] p-3 text-left text-[12px] text-[var(--text)] transition-colors hover:border-[var(--blue)]"
            >
              <div className="flex items-start gap-2">
                <span className="mt-[2px] text-[var(--text3)] transition-colors group-hover:text-[var(--blue)]">↗</span>
                <span className="leading-snug">{prompt}</span>
              </div>
              <div className="mono mt-2 text-[10px] uppercase tracking-[0.14em] text-[var(--text3)]">Send to AI</div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

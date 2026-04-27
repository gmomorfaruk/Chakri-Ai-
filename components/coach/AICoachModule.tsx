"use client";

import { PremiumChatInterface } from "@/components/coach/PremiumChatInterface";
import { QuizPractice } from "@/components/coach/QuizPractice";
import { ConversationalLearningAI } from "@/components/learning/ConversationalLearningAI";
import { useSearchParams } from "next/navigation";

function getInitialView(view: string | null): "chat" | "quiz" | "learning" {
  if (view === "chat" || view === "quiz" || view === "learning") {
    return view;
  }

  return "learning";
}

export function AICoachModule() {
  const searchParams = useSearchParams();
  const view = getInitialView(searchParams.get("view"));

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-x-hidden overflow-y-hidden bg-[#0a0f1e]">
      {/* Content Area */}
      <div className="flex min-h-0 flex-1 overflow-x-hidden overflow-y-hidden">
        {view === "chat" && (
          <div className="h-full min-h-0 w-full overflow-hidden">
            <PremiumChatInterface />
          </div>
        )}
        {view === "learning" && (
          <div className="h-full min-h-0 w-full overflow-hidden">
            <ConversationalLearningAI />
          </div>
        )}
        {view === "quiz" && (
          <div className="h-full min-h-0 w-full overflow-hidden">
            <QuizPractice />
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import { useState } from "react";

type LearningTopic = "general" | "it" | "govt" | "bank" | "ngo";

interface LearningWelcomeStateProps {
  topic: LearningTopic;
  onSuggestedQuestion: (question: string) => void;
}

const suggestedQuestions: Record<LearningTopic, string[]> = {
  general: [
    "How do I build a strong CV for Bangladesh job market?",
    "What are the best strategies for career growth?",
    "How can I transition into a new field?",
    "What soft skills are most valued by employers?",
  ],
  it: [
    "What programming languages should I learn for software jobs?",
    "How do I prepare for technical interviews?",
    "What's the roadmap to become a senior developer?",
    "How do I build a portfolio that impresses startups?",
  ],
  govt: [
    "How do I prepare for BCS examinations?",
    "What are the common topics in government job exams?",
    "How do I ace the written and viva in government jobs?",
    "What's the timeline for government job selections?",
  ],
  bank: [
    "What qualifications do banks prefer for entry-level roles?",
    "How do I prepare for bank recruitment exams?",
    "What's the typical bank job interview process?",
    "How do I advance from probationary officer to management?",
  ],
  ngo: [
    "What skills are essential for NGO/development sector jobs?",
    "How do I transition from corporate to NGO work?",
    "What's the scope for international development roles?",
    "How do I build experience for senior NGO positions?",
  ],
};

export function LearningWelcomeState({
  topic,
  onSuggestedQuestion,
}: LearningWelcomeStateProps) {
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);

  const questions = suggestedQuestions[topic];
  const icons: Record<LearningTopic, string> = {
    general: "🎯",
    it: "💻",
    govt: "🏛️",
    bank: "🏦",
    ngo: "🤝",
  };

  const titles: Record<LearningTopic, string> = {
    general: "Career Guidance",
    it: "Tech & Software",
    govt: "Government & BCS",
    bank: "Banking & Finance",
    ngo: "NGO & Development",
  };

  const handleQuestionClick = (question: string, index: number) => {
    setSelectedQuestion(index);
    setTimeout(() => onSuggestedQuestion(question), 300);
  };

  return (
    <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-b from-[#0d1117] to-[#0a0f1e]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl w-full space-y-8"
      >
        {/* AI Logo Animation */}
        <motion.div
          className="flex justify-center"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <div className="relative w-20 h-20">
            {/* Rotating gradient circle */}
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500"
              animate={{ rotate: 360 }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            />

            {/* Inner white circle */}
            <div className="absolute inset-2 rounded-full bg-[#0d1117] flex items-center justify-center">
              <span className="text-3xl">🎓</span>
            </div>

            {/* Pulsing glow */}
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
              animate={{ opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 3, repeat: Infinity }}
              style={{ filter: "blur(12px)" }}
            />
          </div>
        </motion.div>

        {/* Welcome Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-center space-y-3"
        >
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
            Welcome to Your AI Mentor
          </h1>
          <p className="text-lg text-gray-400">
            {icons[topic]} <span className="font-semibold text-white">{titles[topic]}</span>
          </p>
          <p className="text-sm text-gray-500 max-w-lg mx-auto">
            Ask anything about career strategy, interview prep, skill building, and job opportunities in Bangladesh
          </p>
        </motion.div>

        {/* Suggested Questions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="space-y-3"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 text-center px-4">
            💡 Start with a suggestion
          </p>

          <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
            {questions.map((question, idx) => (
              <motion.button
                key={idx}
                onClick={() => handleQuestionClick(question, idx)}
                onHoverStart={() => setSelectedQuestion(idx)}
                onHoverEnd={() => setSelectedQuestion(null)}
                whileHover={{ y: -4 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + idx * 0.1, duration: 0.4 }}
                className="group relative"
              >
                {/* Background gradient on hover */}
                <div
                  className={`absolute inset-0 rounded-xl transition-all duration-300 ${
                    selectedQuestion === idx
                      ? "bg-gradient-to-r from-blue-500/30 to-purple-500/30"
                      : "bg-gradient-to-r from-blue-500/10 to-purple-500/10 group-hover:from-blue-500/20 group-hover:to-purple-500/20"
                  }`}
                />

                {/* Border and content */}
                <div
                  className={`relative px-4 py-3 rounded-xl border transition-all duration-300 text-left ${
                    selectedQuestion === idx
                      ? "border-blue-500/60 bg-blue-500/5"
                      : "border-white/10 bg-white/5 group-hover:border-white/20 group-hover:bg-white/[0.08]"
                  }`}
                >
                  <p className="text-sm font-medium text-gray-200 line-clamp-2">
                    {question}
                  </p>
                  <motion.div
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-blue-400 transition-colors"
                    animate={
                      selectedQuestion === idx
                        ? { x: [0, 4, 0], opacity: 1 }
                        : { x: 0, opacity: 0.5 }
                    }
                    transition={{ duration: 0.6, repeat: Infinity }}
                  >
                    →
                  </motion.div>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Or Type Custom */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="text-center text-xs text-gray-600"
        >
          Or type your own question below
        </motion.p>
      </motion.div>
    </div>
  );
}

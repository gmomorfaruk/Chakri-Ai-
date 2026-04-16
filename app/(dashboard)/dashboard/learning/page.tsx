"use client";

import { ConversationalLearningAI } from "@/components/learning/ConversationalLearningAI";

/**
 * Career Coach AI Page - Conversational Learning Module
 * 
 * Features:
 * - ChatGPT-style conversational interface
 * - Category-based learning paths (General, IT, Government, Banking, NGO)
 * - Welcome state with suggested prompts
 * - Markdown rendering for AI responses
 * - Streaming responses with typing effect
 * - Suggested follow-up questions
 */
export default function LearningPage() {
  return <ConversationalLearningAI />;
}

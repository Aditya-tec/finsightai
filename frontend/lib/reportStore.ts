"use client";

import { create } from "zustand";

type Citation = { source: string; page?: number; section?: string };

type ReportSection = {
  title: string;
  body: string;
  citations: Citation[];
  chart_data?: unknown;
};

type FollowupMessage = {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
};

type State = {
  ticker?: string;
  sections: ReportSection[];
  followup: FollowupMessage[];
  setReport: (ticker: string, sections: ReportSection[]) => void;
  addFollowup: (msg: FollowupMessage) => void;
  clear: () => void;
};

export const useReportStore = create<State>((set) => ({
  ticker: undefined,
  sections: [],
  followup: [],
  setReport: (ticker, sections) => set({ ticker, sections, followup: [] }),
  addFollowup: (msg) => set((s) => ({ followup: [...s.followup, msg] })),
  clear: () => set({ ticker: undefined, sections: [], followup: [] }),
}));

export function buildConversationHistoryForApi(
  sections: ReportSection[],
  followup: FollowupMessage[]
) {
  const reportContext = sections.map((s) => ({
    role: "assistant",
    content: `${s.title}: ${s.body}`,
    citations: s.citations ?? [],
  }));
  return [...reportContext, ...followup];
}

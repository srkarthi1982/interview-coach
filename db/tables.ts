import { defineTable, column, NOW } from "astro:db";

export const InterviewSessions = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    userId: column.text(),
    title: column.text(),
    jobTitle: column.text({ optional: true }),
    companyName: column.text({ optional: true }),
    mode: column.text({ optional: true }),
    scheduledAt: column.date({ optional: true }),
    durationMinutes: column.number({ optional: true }),
    createdAt: column.date({ default: NOW }),
    updatedAt: column.date({ default: NOW }),
  },
});

export const InterviewQuestions = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    sessionId: column.text({
      references: () => InterviewSessions.columns.id,
    }),
    orderIndex: column.number(),
    question: column.text(),
    idealAnswer: column.text({ optional: true }),
    createdAt: column.date({ default: NOW }),
  },
});

export const InterviewResponses = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    sessionId: column.text({
      references: () => InterviewSessions.columns.id,
    }),
    questionId: column.text({
      references: () => InterviewQuestions.columns.id,
    }),
    answer: column.text(),
    score: column.number({ optional: true }),
    feedback: column.text({ optional: true }),
    createdAt: column.date({ default: NOW }),
  },
});

export const tables = {
  InterviewSessions,
  InterviewQuestions,
  InterviewResponses,
} as const;

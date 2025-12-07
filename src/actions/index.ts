import type { ActionAPIContext } from "astro:actions";
import { defineAction, ActionError } from "astro:actions";
import { z } from "astro:schema";
import { db, eq, and, InterviewSessions, InterviewQuestions, InterviewResponses } from "astro:db";

function requireUser(context: ActionAPIContext) {
  const locals = context.locals as App.Locals | undefined;
  const user = locals?.user;

  if (!user) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to perform this action.",
    });
  }

  return user;
}

export const server = {
  createSession: defineAction({
    input: z.object({
      id: z.string().optional(),
      title: z.string().min(1, "Title is required"),
      jobTitle: z.string().optional(),
      companyName: z.string().optional(),
      mode: z.string().optional(),
      scheduledAt: z.coerce.date().optional(),
      durationMinutes: z.number().int().positive().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [session] = await db
        .insert(InterviewSessions)
        .values({
          id: input.id ?? crypto.randomUUID(),
          userId: user.id,
          title: input.title,
          jobTitle: input.jobTitle,
          companyName: input.companyName,
          mode: input.mode,
          scheduledAt: input.scheduledAt,
          durationMinutes: input.durationMinutes,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return { session };
    },
  }),

  updateSession: defineAction({
    input: z.object({
      id: z.string(),
      title: z.string().min(1).optional(),
      jobTitle: z.string().optional(),
      companyName: z.string().optional(),
      mode: z.string().optional(),
      scheduledAt: z.coerce.date().optional(),
      durationMinutes: z.number().int().positive().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);
      const { id, ...rest } = input;

      const [existing] = await db
        .select()
        .from(InterviewSessions)
        .where(and(eq(InterviewSessions.id, id), eq(InterviewSessions.userId, user.id)))
        .limit(1);

      if (!existing) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Session not found.",
        });
      }

      const updateData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(rest)) {
        if (typeof value !== "undefined") {
          updateData[key] = value;
        }
      }

      if (Object.keys(updateData).length === 0) {
        return { session: existing };
      }

      const [session] = await db
        .update(InterviewSessions)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(and(eq(InterviewSessions.id, id), eq(InterviewSessions.userId, user.id)))
        .returning();

      return { session };
    },
  }),

  listSessions: defineAction({
    input: z.object({}).optional(),
    handler: async (_, context) => {
      const user = requireUser(context);

      const sessions = await db
        .select()
        .from(InterviewSessions)
        .where(eq(InterviewSessions.userId, user.id));

      return { sessions };
    },
  }),

  deleteSession: defineAction({
    input: z.object({
      id: z.string(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [deleted] = await db
        .delete(InterviewSessions)
        .where(and(eq(InterviewSessions.id, input.id), eq(InterviewSessions.userId, user.id)))
        .returning();

      if (!deleted) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Session not found.",
        });
      }

      return { session: deleted };
    },
  }),

  saveQuestion: defineAction({
    input: z.object({
      id: z.string().optional(),
      sessionId: z.string(),
      orderIndex: z.number().int().positive(),
      question: z.string().min(1, "Question is required"),
      idealAnswer: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [session] = await db
        .select()
        .from(InterviewSessions)
        .where(and(eq(InterviewSessions.id, input.sessionId), eq(InterviewSessions.userId, user.id)))
        .limit(1);

      if (!session) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Session not found.",
        });
      }

      const baseValues = {
        sessionId: input.sessionId,
        orderIndex: input.orderIndex,
        question: input.question,
        idealAnswer: input.idealAnswer,
        createdAt: new Date(),
      };

      if (input.id) {
        const [existing] = await db
          .select()
          .from(InterviewQuestions)
          .where(eq(InterviewQuestions.id, input.id))
          .limit(1);

        if (!existing || existing.sessionId !== input.sessionId) {
          throw new ActionError({
            code: "NOT_FOUND",
            message: "Question not found.",
          });
        }

        const [question] = await db
          .update(InterviewQuestions)
          .set(baseValues)
          .where(eq(InterviewQuestions.id, input.id))
          .returning();

        return { question };
      }

      const [question] = await db.insert(InterviewQuestions).values(baseValues).returning();
      return { question };
    },
  }),

  deleteQuestion: defineAction({
    input: z.object({
      id: z.string(),
      sessionId: z.string(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [session] = await db
        .select()
        .from(InterviewSessions)
        .where(and(eq(InterviewSessions.id, input.sessionId), eq(InterviewSessions.userId, user.id)))
        .limit(1);

      if (!session) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Session not found.",
        });
      }

      const [deleted] = await db
        .delete(InterviewQuestions)
        .where(and(eq(InterviewQuestions.id, input.id), eq(InterviewQuestions.sessionId, input.sessionId)))
        .returning();

      if (!deleted) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Question not found.",
        });
      }

      return { question: deleted };
    },
  }),

  saveResponse: defineAction({
    input: z.object({
      id: z.string().optional(),
      sessionId: z.string(),
      questionId: z.string(),
      answer: z.string().min(1, "Answer is required"),
      score: z.number().int().optional(),
      feedback: z.string().optional(),
    }),
    handler: async (input, context) => {
      const user = requireUser(context);

      const [session] = await db
        .select()
        .from(InterviewSessions)
        .where(and(eq(InterviewSessions.id, input.sessionId), eq(InterviewSessions.userId, user.id)))
        .limit(1);

      if (!session) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Session not found.",
        });
      }

      const [question] = await db
        .select()
        .from(InterviewQuestions)
        .where(
          and(
            eq(InterviewQuestions.id, input.questionId),
            eq(InterviewQuestions.sessionId, input.sessionId)
          )
        )
        .limit(1);

      if (!question) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Question not found.",
        });
      }

      const baseValues = {
        sessionId: input.sessionId,
        questionId: input.questionId,
        answer: input.answer,
        score: input.score,
        feedback: input.feedback,
        createdAt: new Date(),
      };

      if (input.id) {
        const [existing] = await db
          .select()
          .from(InterviewResponses)
          .where(eq(InterviewResponses.id, input.id))
          .limit(1);

        if (!existing || existing.sessionId !== input.sessionId) {
          throw new ActionError({
            code: "NOT_FOUND",
            message: "Response not found.",
          });
        }

        const [response] = await db
          .update(InterviewResponses)
          .set(baseValues)
          .where(eq(InterviewResponses.id, input.id))
          .returning();

        return { response };
      }

      const [response] = await db.insert(InterviewResponses).values(baseValues).returning();
      return { response };
    },
  }),

  listResponses: defineAction({
    input: z
      .object({
        sessionId: z.string().optional(),
        questionId: z.string().optional(),
      })
      .optional(),
    handler: async (input, context) => {
      const user = requireUser(context);

      const sessions = await db
        .select()
        .from(InterviewSessions)
        .where(eq(InterviewSessions.userId, user.id));

      const allowedSessionIds = new Set(sessions.map((s) => s.id));

      if (input?.sessionId && !allowedSessionIds.has(input.sessionId)) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "Session not found.",
        });
      }

      const responses = await db.select().from(InterviewResponses);

      const filtered = responses.filter((r) => {
        const matchesSession = allowedSessionIds.has(r.sessionId);
        const matchesRequestedSession = input?.sessionId ? r.sessionId === input.sessionId : true;
        const matchesQuestion = input?.questionId ? r.questionId === input.questionId : true;
        return matchesSession && matchesRequestedSession && matchesQuestion;
      });

      return { responses: filtered };
    },
  }),
};

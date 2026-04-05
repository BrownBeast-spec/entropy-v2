import { z } from "zod";

const FollowUpResultSchema = z.object({
  suggestions: z.array(z.string().trim().min(1)).length(3),
});

export type FollowUpResult = z.infer<typeof FollowUpResultSchema>;

type FollowUpInput = {
  graphSnapshot: {
    nodeIds: string[];
    edgeSummary: Array<Record<string, unknown>>;
  };
  personaMode: "Researcher" | "Strategist";
};

const researcherDefaults = [
  "Which high-confidence targets should we validate next?",
  "What safety signals appear for the lead compounds in this graph?",
  "Which related trials can strengthen evidence for this hypothesis?",
];

const strategistDefaults = [
  "Which companies dominate patents in this landscape?",
  "Where are the nearest patent expiry opportunities?",
  "Which active sponsors indicate competitive momentum?",
];

export async function suggestFollowups(
  input: FollowUpInput,
): Promise<FollowUpResult> {
  const base =
    input.personaMode === "Strategist"
      ? strategistDefaults
      : researcherDefaults;

  const suffix = input.graphSnapshot.nodeIds.length
    ? ` (current graph nodes: ${input.graphSnapshot.nodeIds.length})`
    : "";

  return FollowUpResultSchema.parse({
    suggestions: base.map((item) => `${item}${suffix}`),
  });
}

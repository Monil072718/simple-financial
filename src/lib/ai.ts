import type { ProfileRow } from "@/lib/profiles";

export type TaskForAI = {
  title: string;
  description?: string | null;
};

export type AssigneeSuggestion = {
  profileId: number;
  score: number; // 0..1
  reason: string;
};

function tokenize(text: string): string[] {
  return (text || "")
    .toLowerCase()
    .replace(/[^a-z0-9+#.\-\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function heuristicScore(task: TaskForAI, profile: ProfileRow): number {
  const taskTokens = new Set(tokenize(`${task.title} ${task.description ?? ""}`));
  const profileTokens = new Set(
    tokenize(
      `${profile.full_name} ${profile.title ?? ""} ${profile.description ?? ""} ${(profile.languages || []).join(", ")}`
    )
  );

  let matches = 0;
  taskTokens.forEach((t) => {
    if (profileTokens.has(t)) matches += 1;
  });
  const denom = Math.max(4, taskTokens.size);
  return Math.min(1, matches / denom);
}

export async function suggestAssignees(
  task: TaskForAI,
  profiles: ProfileRow[],
  topK: number = 3
): Promise<AssigneeSuggestion[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Fallback: deterministic heuristic
    return profiles
      .map((p) => ({ profileId: p.id, score: heuristicScore(task, p), reason: "keyword match" }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  const system = `You are an assistant that selects the most suitable developers for a given task based on their profiles. Return ONLY valid JSON array with objects {profileId:number, score:number (0..1), reason:string}.`;
  const profileSummaries = profiles
    .map(
      (p) =>
        `{"id":${p.id},"name":"${p.full_name}","title":"${p.title ?? ""}","desc":"${(p.description ?? "").replace(
          /"/g,
          "\""
        )}","skills":"${(p.languages || []).join(", ")}"}`
    )
    .join("\n");

  const user = `Task: ${task.title}\nDescription: ${task.description ?? ""}\nProfiles (JSON lines):\n${profileSummaries}\nInstruction: Pick up to ${topK} best profiles. Output JSON only.`;

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
    }),
  });

  if (!resp.ok) {
    // Fallback to heuristic on API failure
    return profiles
      .map((p) => ({ profileId: p.id, score: heuristicScore(task, p), reason: "keyword match (fallback)" }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  const json = await resp.json();
  const content: string = json?.choices?.[0]?.message?.content?.trim?.() ?? "[]";
  try {
    const parsed = JSON.parse(content) as AssigneeSuggestion[];
    return parsed
      .filter((x) => typeof x.profileId === "number")
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, topK);
  } catch {
    // If the model returned non-JSON content
    return profiles
      .map((p) => ({ profileId: p.id, score: heuristicScore(task, p), reason: "keyword match (parse fallback)" }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}



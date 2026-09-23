import type { RelationshipEdge } from "./types";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-120b";

const SYSTEM_PROMPT = `You are an expert celebrity biographer tracking public romantic relationship histories.
Your task is to list well-known romantic relationships (dating, relationships, engagements, marriages) of the requested public figure that have been publicly reported in mainstream news or entertainment media (e.g. People, Vanity Fair, Billboard, Variety, Vogue, Page Six, etc.).

IMPORTANT RULES:
1. Include notable romantic partners (dating, engaged, married) who are well-known to have dated or been in a relationship with the person.
2. ABSOLUTE RESTRICTION: NEVER include family members, parents, siblings, children, or relatives (e.g. Arbaaz Khan and Sohail Khan are brothers of Salman Khan — NEVER list them as partners or spouses).
3. If the person has NEVER been married (such as Salman Khan), do not list anyone as "married". Only use "married" if an actual marriage took place.
4. Do not include platonic friends or movie co-stars who never actually had a reported romantic relationship.
5. If you genuinely do not know of any public romantic relationships for this person (e.g. minors, young athletes, private individuals), return {"relationships": []}.
6. For dates: use "YYYY", "YYYY-MM", or null if the year is unknown.
7. If the relationship is currently ongoing, set "end" to null and "ongoing" to true.
8. Output strictly valid JSON matching this schema:
{
  "relationships": [
    {
      "partnerName": string,
      "type": "dating" | "engaged" | "married",
      "start": string | null,
      "end": string | null,
      "ongoing": boolean,
      "updateOnly": boolean
    }
  ]
}`;

interface RawLLMRelationship {
  partnerName: string;
  type: "dating" | "engaged" | "married" | "spouse" | "partner";
  start: string | null;
  end: string | null;
  ongoing: boolean;
  updateOnly?: boolean;
}

function isValidRaw(x: any): x is RawLLMRelationship {
  return (
    x &&
    typeof x.partnerName === "string" &&
    x.partnerName.trim().length > 1 &&
    !/^Q\d+$/i.test(x.partnerName.trim()) &&
    ["dating", "engaged", "married", "spouse", "partner"].includes(x.type?.toLowerCase()) &&
    (x.start === null || typeof x.start === "string") &&
    (x.end === null || typeof x.end === "string") &&
    typeof x.ongoing === "boolean"
  );
}

export async function fetchLLMRelationships(
  name: string,
  knownPartnerNames: string[],
  knownRelatives: string[] = []
): Promise<RelationshipEdge[]> {
  console.log("[LLM] fetchLLMRelationships called for:", name);
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.log("[LLM] GROQ_API_KEY is not set — skipping LLM call");
    return [];
  }
  console.log("[LLM] GROQ_API_KEY found, sending request to Groq (model:", MODEL, ")...");

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Public figure: ${name}
Already known relationships (do not repeat unless adding a missing end date): ${
              knownPartnerNames.join(", ") || "none"
            }
Known family members/relatives (DO NOT INCLUDE AS PARTNERS): ${
              knownRelatives.join(", ") || "none"
            }

Return the JSON now.`,
          },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.log("[LLM] API error:", res.status, res.statusText);
      return [];
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    console.log("[LLM] Raw response content:", content);
    if (!content) return [];

    const parsed = JSON.parse(content);
    const rawList: unknown[] = Array.isArray(parsed?.relationships)
      ? parsed.relationships
      : [];
    console.log("[LLM] Parsed relationships (", rawList.length, "):", JSON.stringify(rawList, null, 2));

    const normalizedTargetName = name.trim().toLowerCase();
    const normalizedRelatives = new Set(
      knownRelatives.map((r) => r.trim().toLowerCase())
    );

    return rawList
      .filter(isValidRaw)
      .filter((r) => {
        const pName = r.partnerName.trim().toLowerCase();
        // Never allow self-relationships
        if (pName === normalizedTargetName) {
          console.log(`[LLM] Blocked self-relationship: ${r.partnerName}`);
          return false;
        }
        // Never allow known family/relatives
        if (normalizedRelatives.has(pName)) {
          console.log(`[LLM] Blocked hallucinated relative: ${r.partnerName}`);
          return false;
        }
        return true;
      })
      .map((r) => ({
        partnerQid: null,
        name: r.partnerName.trim(),
        type: r.type === "married" ? "spouse" : "partner",
        start: r.start,
        end: r.end,
        ongoing: r.ongoing,
        image: null,
        source: "llm" as const,
        confidence: "reported" as const,
      }));
  } catch (err) {
    console.log("[LLM] Error during fetch/parse:", err);
    return [];
  }
}

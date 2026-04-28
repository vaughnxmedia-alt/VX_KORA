import { supabase } from "@/integrations/supabase/client";
import {
  buildAuditVisualPrompt,
  normalizeAuditVisualInput,
  type AuditVisualInput,
  type AuditVisualType,
} from "./engine";

export type GeneratedAuditVisual = {
  imageUrl: string;
  prompt: string;
  visualType: AuditVisualType;
  model?: string;
};

export async function generateAuditVisual(
  promptData: AuditVisualInput,
  visualType: AuditVisualType = "hero",
): Promise<GeneratedAuditVisual> {
  const normalized = normalizeAuditVisualInput(promptData);
  const prompt = buildAuditVisualPrompt(normalized, visualType);

  const { data, error } = await supabase.functions.invoke("generate-audit-visual", {
    body: {
      visualType,
      promptData: normalized,
      prompt,
    },
  });

  if (error) {
    let detail = error.message || "Could not generate audit visual.";
    const maybeContext = (error as { context?: unknown }).context;
    if (maybeContext && typeof maybeContext === "object" && "json" in (maybeContext as Record<string, unknown>)) {
      try {
        const payload = await (maybeContext as { json: () => Promise<unknown> }).json();
        const parsed = payload as { error?: string; message?: string };
        detail = parsed.error || parsed.message || detail;
      } catch {
        // keep default detail
      }
    }
    throw new Error(detail);
  }
  if (!data?.imageUrl) throw new Error("Image generation returned no image URL.");

  return {
    imageUrl: String(data.imageUrl),
    prompt: String(data.prompt ?? prompt),
    visualType,
    model: typeof data.model === "string" ? data.model : undefined,
  };
}

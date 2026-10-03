import { ciApi } from "./api";
import type { CiActivityEventType } from "./types";

export function trackCiActivity(input: {
  organization_id?: string | null;
  event_type: CiActivityEventType;
  entity_type?: string | null;
  entity_id?: string | null;
}) {
  if (!input.organization_id) return;
  void ciApi.activity
    .record({
      organization_id: input.organization_id,
      event_type: input.event_type,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
    })
    .catch(() => undefined);
}

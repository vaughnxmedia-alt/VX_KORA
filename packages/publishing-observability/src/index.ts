export type PublishMetricEvent =
  | "publish_job_claimed"
  | "publish_job_succeeded"
  | "publish_job_failed"
  | "token_refresh_failed";

export function logPublishMetric(event: PublishMetricEvent, context: Record<string, unknown>) {
  // Placeholder hook for future analytics provider wiring.
  console.log("[publishing-metric]", event, context);
}

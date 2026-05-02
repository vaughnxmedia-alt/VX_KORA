import { useEffect } from "react";

type StructuredDataProps = {
  id: string;
  data: Record<string, unknown> | Record<string, unknown>[];
};

export function StructuredData({ id, data }: StructuredDataProps) {
  useEffect(() => {
    const scriptId = `structured-data-${id}`;
    document.getElementById(scriptId)?.remove();

    const script = document.createElement("script");
    script.id = scriptId;
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(Array.isArray(data) ? { "@context": "https://schema.org", "@graph": data } : data);
    document.head.appendChild(script);

    return () => {
      document.getElementById(scriptId)?.remove();
    };
  }, [id, data]);

  return null;
}

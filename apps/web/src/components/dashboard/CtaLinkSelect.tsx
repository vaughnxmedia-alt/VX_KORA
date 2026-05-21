import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CTA_PAGE_LINKS,
  PDF_GUIDE_LINKS,
  briefPostLink,
  findMarketingLinkByUrl,
  type MarketingLinkOption,
} from "@/lib/subscriberMarketingLinks";

type BlogPost = { id: string; title: string; slug: string | null };

type Props = {
  value: string;
  onValueChange: (url: string, option?: MarketingLinkOption) => void;
  blogPosts?: BlogPost[];
  placeholder?: string;
  allowCustom?: boolean;
};

export function CtaLinkSelect({
  value,
  onValueChange,
  blogPosts = [],
  placeholder = "Select page or Brief post",
}: Props) {
  const briefOptions = blogPosts
    .filter((p) => p.slug)
    .map((p) => briefPostLink(p.slug!, p.title));

  const matched = findMarketingLinkByUrl(value);
  const briefMatch = briefOptions.find((o) => o.url.replace(/\/$/, "") === value.replace(/\/$/, ""));
  const selectValue = matched?.value ?? briefMatch?.value ?? (value ? `custom:${value}` : "");

  const handleChange = (picked: string) => {
    if (picked.startsWith("custom:")) {
      onValueChange(picked.slice(7));
      return;
    }
    const opt =
      [...CTA_PAGE_LINKS, ...PDF_GUIDE_LINKS, ...briefOptions].find((o) => o.value === picked);
    if (opt) onValueChange(opt.url, opt);
    else onValueChange(picked);
  };

  return (
    <Select value={selectValue || undefined} onValueChange={handleChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-[min(24rem,70vh)]">
        <SelectGroup>
          <SelectLabel>CTA pages</SelectLabel>
          {CTA_PAGE_LINKS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectGroup>
          <SelectLabel>PDF guides</SelectLabel>
          {PDF_GUIDE_LINKS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectGroup>
        {briefOptions.length > 0 ? (
          <SelectGroup>
            <SelectLabel>The Brief</SelectLabel>
            {briefOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectGroup>
        ) : null}
        {value && !matched && !briefMatch ? (
          <SelectGroup>
            <SelectLabel>Current</SelectLabel>
            <SelectItem value={`custom:${value}`}>{value}</SelectItem>
          </SelectGroup>
        ) : null}
      </SelectContent>
    </Select>
  );
}

import { useState, type ComponentType } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ClipboardList,
  ExternalLink,
  FileAudio,
  FileText,
  FolderOpen,
  Headphones,
  Loader2,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { UserAssetCategoryButtons } from "@/components/dashboard/UserAssetCategoryDialog";
import {
  fetchPreScreeningUsers,
  fetchScreenedUsers,
  openIntakeAsset,
  type PreScreeningUser,
  type ScreenedUser,
} from "@/lib/assetLibrary";

function AssetButton({
  href,
  label,
  icon: Icon,
  disabled,
  external,
}: {
  href: string | null;
  label: string;
  icon: ComponentType<{ className?: string }>;
  disabled?: boolean;
  external?: boolean;
}) {
  if (!href || disabled) {
    return (
      <Button type="button" variant="outline" size="sm" disabled className="gap-2">
        <Icon className="h-4 w-4" />
        {label}
        <span className="text-muted-foreground text-xs">—</span>
      </Button>
    );
  }
  if (external) {
    return (
      <Button type="button" variant="outline" size="sm" className="gap-2" asChild>
        <a href={href} target="_blank" rel="noopener noreferrer">
          <Icon className="h-4 w-4" />
          {label}
          <ExternalLink className="h-3 w-3 opacity-60" />
        </a>
      </Button>
    );
  }
  return (
    <Button type="button" variant="outline" size="sm" className="gap-2" asChild>
      <Link to={href}>
        <Icon className="h-4 w-4" />
        {label}
      </Link>
    </Button>
  );
}

function PreScreeningCard({ user }: { user: PreScreeningUser }) {
  const pdfReady = user.assets.pdfStatus === "sent" || user.followUpStatus === "audit_sent";
  const hasAudio = Boolean(user.assets.audioUrl || user.assets.audioListenUrl);
  const audioHref = user.assets.audioUrl ?? user.assets.audioListenUrl;

  return (
    <AccordionItem value={user.auditId} className="border rounded-lg px-4 mb-3">
      <AccordionTrigger className="hover:no-underline py-4">
        <div className="flex flex-1 flex-col gap-1 text-left sm:flex-row sm:items-center sm:justify-between sm:pr-4">
          <div>
            <p className="font-semibold text-primary">{user.businessName}</p>
            <p className="text-sm text-muted-foreground">
              {user.email ?? "No email"}
              {user.contactName ? ` · ${user.contactName}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
            <Badge variant="outline">{user.deliveryPath}</Badge>
            {user.deliveryPath === "Audit" && (
              <Badge variant="secondary" className="text-xs">
                {user.assets.pdfStatus === "sent" ? "PDF sent" : user.assets.audioStatus === "generated" ? "Audio ready" : "Pre-screen"}
              </Badge>
            )}
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-4">
        <p className="text-xs text-muted-foreground mb-3">
          Submitted {format(new Date(user.submittedAt), "MMM d, yyyy")} · Audit on file, no Strategy Session booked yet.
        </p>
        <UserAssetCategoryButtons
          auditId={user.auditId}
          customerId={user.customerId}
          businessName={user.businessName}
          className="mb-4"
        />
        {user.deliveryPath === "Guide" ? (
          <p className="text-sm text-muted-foreground mb-3">
            Starter guide path — no full diagnosis PDF or audio brief. Open{" "}
            <Link to="/dashboard/audits" className="text-primary underline-offset-4 hover:underline">
              Audits
            </Link>{" "}
            for guide delivery.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <AssetButton href={user.auditsHref} label="Brand diagnosis PDF" icon={FileText} disabled={!pdfReady} />
            <AssetButton
              href={audioHref}
              label="Audio brief"
              icon={hasAudio && user.assets.audioUrl ? Headphones : FileAudio}
              external={Boolean(user.assets.audioUrl)}
              disabled={!hasAudio}
            />
            <AssetButton href={user.auditsHref} label="Open in Audits" icon={ClipboardList} />
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

function ScreenedCard({
  user,
  onOpenAsset,
  openingPath,
}: {
  user: ScreenedUser;
  onOpenAsset: (path: string) => void;
  openingPath: string | null;
}) {
  const { reports } = user;
  const hasIntakeFiles = reports.intakeAssets.length > 0;
  const hasIdentity = Boolean(reports.identityBlueprintId);
  const hasAudience = reports.audienceProfileIds.length > 0;

  return (
    <AccordionItem value={user.customerId} className="border rounded-lg px-4 mb-3">
      <AccordionTrigger className="hover:no-underline py-4">
        <div className="flex flex-1 flex-col gap-1 text-left sm:flex-row sm:items-center sm:justify-between sm:pr-4">
          <div>
            <p className="font-semibold text-primary">{user.businessName}</p>
            <p className="text-sm text-muted-foreground">
              {user.email ?? "No email"}
              {user.contactName ? ` · ${user.contactName}` : ""}
            </p>
          </div>
          <Badge className="w-fit bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300">
            Screened
          </Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-4 space-y-4">
        <p className="text-xs text-muted-foreground">
          Strategy Session
          {user.sessionDate ? ` · ${format(new Date(user.sessionDate), "MMM d, yyyy")}` : ""} — strategy team deliverables.
        </p>
        <UserAssetCategoryButtons
          auditId={user.auditId}
          customerId={user.customerId}
          businessName={user.businessName}
          extraDocs={reports.intakeAssets}
          className="mb-2"
        />

        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Intake
            </p>
            {hasIntakeFiles ? (
              <ul className="space-y-1">
                {reports.intakeAssets.map((asset) => (
                  <li key={asset.storage_path}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto py-1 px-2 text-sm font-normal"
                      disabled={openingPath === asset.storage_path}
                      onClick={() => onOpenAsset(asset.storage_path)}
                    >
                      {openingPath === asset.storage_path ? (
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      ) : (
                        <FileText className="h-3 w-3 mr-2" />
                      )}
                      {asset.filename}
                      <span className="ml-2 text-muted-foreground text-xs">({asset.kind})</span>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No session uploads yet.{" "}
                <Link to={user.intakeHref} className="text-primary underline-offset-4 hover:underline">
                  Add on Intake
                </Link>
                .
              </p>
            )}
          </div>

          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Identities
            </p>
            {hasIdentity ? (
              <AssetButton href={reports.identityHref} label="Brand identity report" icon={Sparkles} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Identity not generated yet.{" "}
                <Link to="/dashboard/identities" className="text-primary underline-offset-4 hover:underline">
                  Brand Identities
                </Link>
                .
              </p>
            )}
          </div>

          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Audiences
            </p>
            {hasAudience ? (
              <div className="flex flex-wrap items-center gap-2">
                <AssetButton href={reports.audienceHref} label="Audience intelligence" icon={Users} />
                <span className="text-xs text-muted-foreground">
                  {reports.audienceProfileIds.length} report
                  {reports.audienceProfileIds.length === 1 ? "" : "s"}
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No audience report yet.{" "}
                <Link to="/dashboard/audience" className="text-primary underline-offset-4 hover:underline">
                  Audience Intelligence
                </Link>
                .
              </p>
            )}
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export default function AssetLibrary() {
  const [openingPath, setOpeningPath] = useState<string | null>(null);

  const preScreenQuery = useQuery({
    queryKey: ["asset-library-pre-screening"],
    queryFn: fetchPreScreeningUsers,
  });

  const screenedQuery = useQuery({
    queryKey: ["asset-library-screened"],
    queryFn: fetchScreenedUsers,
  });

  const handleOpenIntake = async (storagePath: string) => {
    setOpeningPath(storagePath);
    try {
      const url = await openIntakeAsset(storagePath);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      else toast.error("Could not open file");
    } finally {
      setOpeningPath(null);
    }
  };

  const preScreenUsers = preScreenQuery.data ?? [];
  const preScreenAuditCount = preScreenUsers.filter((u) => u.deliveryPath === "Audit").length;
  const screened = screenedQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary mb-1">Asset Library</h1>
        <p className="text-muted-foreground max-w-3xl">
          Client deliverables grouped by funnel stage. <strong>Pre Screening</strong> — free audit on file, no Strategy
          Session booked (PDF + audio brief). <strong>Screened</strong> — paid session completed; strategy team reports
          (Intake uploads, Identities, Audiences).
        </p>
      </div>

      <Tabs defaultValue="pre-screening" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pre-screening">
            Pre Screening
            {preScreenQuery.isSuccess && (
              <Badge variant="secondary" className="ml-2">
                {preScreenUsers.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="screened">
            Screened
            {screenedQuery.isSuccess && (
              <Badge variant="secondary" className="ml-2">
                {screened.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pre-screening">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5" />
                Pre Screening
              </CardTitle>
              <CardDescription>
                Leads with a Brand Diagnosis audit who have not booked a Strategy Session. Each user should have a PDF
                report and private audio brief when generated.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {preScreenQuery.isLoading ? (
                <div className="flex justify-center py-12">
                  <Spinner className="h-8 w-8" />
                </div>
              ) : preScreenUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-10">No pre-screening leads yet.</p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    {preScreenAuditCount} with full Brand Diagnosis (PDF + audio).{" "}
                    {preScreenUsers.length - preScreenAuditCount > 0
                      ? `${preScreenUsers.length - preScreenAuditCount} on starter guide path — see Audits for guide email only.`
                      : null}
                  </p>
                  <Accordion type="multiple" className="w-full">
                    {preScreenUsers.map((user) => (
                      <PreScreeningCard key={user.auditId} user={user} />
                    ))}
                  </Accordion>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="screened">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Screened
              </CardTitle>
              <CardDescription>
                Clients with a confirmed paid Strategy Session. Intake session files, Brand Identity, and Audience
                Intelligence reports from the strategy team.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {screenedQuery.isLoading ? (
                <div className="flex justify-center py-12">
                  <Spinner className="h-8 w-8" />
                </div>
              ) : screened.length === 0 ? (
                <p className="text-center text-muted-foreground py-10">
                  No screened clients yet. Confirm Strategy Session bookings in{" "}
                  <Link to="/dashboard/leads" className="text-primary underline-offset-4 hover:underline">
                    Leads
                  </Link>
                  .
                </p>
              ) : (
                <Accordion type="multiple" className="w-full">
                  {screened.map((user) => (
                    <ScreenedCard
                      key={user.customerId}
                      user={user}
                      openingPath={openingPath}
                      onOpenAsset={(path) => void handleOpenIntake(path)}
                    />
                  ))}
                </Accordion>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SentEmailsPanel } from "@/components/dashboard/SentEmailsPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Download, Mail, Trash2, Users } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type Subscriber = {
  id: string;
  name: string;
  email: string;
  created_at: string;
  email_sent: boolean;
};

export default function Subscribers() {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<Subscriber | null>(null);

  const { data: subscribers, isLoading, error } = useQuery({
    queryKey: ["subscribers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscribers")
        .select("id, name, email, created_at, email_sent")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Subscriber[];
    },
  });

  const deleteSubscriberMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subscribers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Subscriber removed from The Brief.");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["subscribers"] });
      queryClient.invalidateQueries({ queryKey: ["outbound-email-logs"] });
    },
    onError: (err: Error) => toast.error(err.message || "Could not delete subscriber"),
  });

  const handleExportCSV = () => {
    if (!subscribers?.length) return;

    const headers = ["Name", "Email", "Subscribed Date", "Email Sent"];
    const rows = subscribers.map((sub) => [
      sub.name,
      sub.email,
      format(new Date(sub.created_at), "yyyy-MM-dd HH:mm"),
      sub.email_sent ? "Yes" : "No",
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `subscribers-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Error loading subscribers.</p>
      </div>
    );
  }

  const emailSentCount = subscribers?.filter((s) => s.email_sent).length || 0;
  const pendingCount = (subscribers?.length || 0) - emailSentCount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Subscribers</h1>
          <p className="text-muted-foreground">
            Manage your email subscriber list
          </p>
        </div>
        <Button onClick={handleExportCSV} disabled={!subscribers?.length}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscribers?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {emailSentCount}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {pendingCount}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="subscribers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
          <TabsTrigger value="sent-emails">Sent emails</TabsTrigger>
        </TabsList>

        <TabsContent value="subscribers">
          <Card>
            <CardHeader>
              <CardTitle>All Subscribers</CardTitle>
            </CardHeader>
            <CardContent>
              {subscribers?.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No subscribers yet. The popup will start collecting emails.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Subscribed</TableHead>
                      <TableHead className="min-w-[8rem]">Status</TableHead>
                      <TableHead className="w-12 pr-2 text-right">
                        <span className="sr-only">Remove</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscribers?.map((subscriber) => (
                      <TableRow key={subscriber.id}>
                        <TableCell className="font-medium">{subscriber.name}</TableCell>
                        <TableCell>{subscriber.email}</TableCell>
                        <TableCell>{format(new Date(subscriber.created_at), "MMM d, yyyy")}</TableCell>
                        <TableCell>
                          <Badge variant={subscriber.email_sent ? "default" : "secondary"}>
                            {subscriber.email_sent ? "Email Sent" : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell className="p-2 text-right">
                          <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            className="h-8 w-8 shrink-0"
                            aria-label="Remove subscriber"
                            onClick={() => setDeleteTarget(subscriber)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sent-emails">
          <SentEmailsPanel messageTypesIn={["subscriber_verification"]} />
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete subscriber?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes {deleteTarget?.email || "this subscriber"} from The Brief list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteSubscriberMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteTarget) return;
                deleteSubscriberMutation.mutate(deleteTarget.id);
              }}
              disabled={deleteSubscriberMutation.isPending}
            >
              {deleteSubscriberMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

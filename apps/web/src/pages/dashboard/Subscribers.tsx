import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Mail, Users } from "lucide-react";
import { format } from "date-fns";

type Subscriber = {
  id: string;
  name: string;
  email: string;
  created_at: string;
  email_sent: boolean;
};

export default function Subscribers() {
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

      {/* Stats Cards */}
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
              {subscribers?.filter((s) => s.email_sent).length || 0}
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
              {subscribers?.filter((s) => !s.email_sent).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscribers Table */}
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
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscribers?.map((subscriber) => (
                  <TableRow key={subscriber.id}>
                    <TableCell className="font-medium">{subscriber.name}</TableCell>
                    <TableCell>{subscriber.email}</TableCell>
                    <TableCell>
                      {format(new Date(subscriber.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={subscriber.email_sent ? "default" : "secondary"}>
                        {subscriber.email_sent ? "Email Sent" : "Pending"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

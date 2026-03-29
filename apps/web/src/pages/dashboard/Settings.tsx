import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Settings as SettingsIcon, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  QrCode,
  Bell,
  Calendar,
  Sparkles,
  RefreshCw,
  ExternalLink
} from "lucide-react";

type DeliveryFrequency = "daily" | "weekly" | "none";

interface TelegramStatus {
  isConnected: boolean;
  isVerified: boolean;
  chatId: string | null;
  botUsername: string;
  lastMessageSent: string | null;
  nextScheduled: string | null;
}

export default function Settings() {
  const [telegramStatus] = useState<TelegramStatus>({
    isConnected: true,
    isVerified: true,
    chatId: "8216104620",
    botUsername: "@KORAIntelBot",
    lastMessageSent: "Today 7:00 AM",
    nextScheduled: "Tomorrow 7:00 AM"
  });

  const [deliveryFrequency, setDeliveryFrequency] = useState<DeliveryFrequency>("daily");
  const [briefingTime, setBriefingTime] = useState("07:00");
  const [includeContentStrategy, setIncludeContentStrategy] = useState(true);
  const [includeInsights, setIncludeInsights] = useState(true);
  const [includeEvents, setIncludeEvents] = useState(true);
  const [makeMeSmarter, setMakeMeSmarter] = useState(true);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary mb-1">Settings</h1>
        <p className="text-muted-foreground">Manage your KORA preferences and integrations.</p>
      </div>

      <Tabs defaultValue="telegram" className="space-y-6">
        <TabsList>
          <TabsTrigger value="telegram" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Telegram
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            Account
          </TabsTrigger>
        </TabsList>

        {/* Telegram Settings */}
        <TabsContent value="telegram" className="space-y-6">
          {/* Connection Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-blue-500" />
                Telegram Connection
              </CardTitle>
              <CardDescription>
                Connect to KORA's Telegram bot to receive daily intelligence briefings and approve content strategies.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status Display */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${telegramStatus.isConnected ? "bg-green-100" : "bg-gray-100"}`}>
                    <Send className={`h-6 w-6 ${telegramStatus.isConnected ? "text-green-600" : "text-gray-400"}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {telegramStatus.isConnected ? "Connected" : "Not Connected"}
                      </span>
                      {telegramStatus.isVerified ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </div>
                    {telegramStatus.chatId && (
                      <p className="text-sm text-muted-foreground">
                        Chat ID: {telegramStatus.chatId} • Bot: {telegramStatus.botUsername}
                      </p>
                    )}
                  </div>
                </div>
                {telegramStatus.isConnected ? (
                  <Button variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reconnect
                  </Button>
                ) : (
                  <Button size="sm">
                    Connect Bot
                  </Button>
                )}
              </div>

              {/* QR Code Section */}
              {!telegramStatus.isConnected && (
                <div className="flex flex-col items-center py-8 border-2 border-dashed rounded-lg">
                  <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center mb-4">
                    <QrCode className="h-24 w-24 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">Scan with Telegram to connect</p>
                  <p className="text-xs text-muted-foreground">
                    Or search for {telegramStatus.botUsername} in Telegram
                  </p>
                </div>
              )}

              {/* Last Message Info */}
              {telegramStatus.isConnected && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Last Message Sent</p>
                    <p className="font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {telegramStatus.lastMessageSent || "Never"}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Next Scheduled</p>
                    <p className="font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {telegramStatus.nextScheduled || "Not scheduled"}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delivery Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Delivery Preferences</CardTitle>
              <CardDescription>
                Choose how often you want to receive intelligence briefings via Telegram.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Frequency Selection */}
              <div className="space-y-3">
                <Label>Briefing Frequency</Label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: "daily", label: "Daily", description: "Every morning" },
                    { value: "weekly", label: "Weekly", description: "Every Monday" },
                    { value: "none", label: "None", description: "Disabled" }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setDeliveryFrequency(option.value as DeliveryFrequency)}
                      className={`p-4 rounded-lg border-2 text-left transition-colors ${
                        deliveryFrequency === option.value
                          ? "border-primary bg-primary/5"
                          : "border-muted hover:border-muted-foreground/30"
                      }`}
                    >
                      <p className="font-medium">{option.label}</p>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Selection */}
              {deliveryFrequency !== "none" && (
                <div className="space-y-2">
                  <Label htmlFor="briefing-time">Briefing Time</Label>
                  <div className="flex items-center gap-4">
                    <input
                      id="briefing-time"
                      type="time"
                      value={briefingTime}
                      onChange={(e) => setBriefingTime(e.target.value)}
                      className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                    <span className="text-sm text-muted-foreground">
                      Puerto Rico Time (AST)
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Content Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Content Preferences</CardTitle>
              <CardDescription>
                Choose what types of content to include in your Telegram briefings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label>Content Strategy Suggestions</Label>
                  <p className="text-sm text-muted-foreground">
                    AI-generated content ideas based on industry trends
                  </p>
                </div>
                <Switch
                  checked={includeContentStrategy}
                  onCheckedChange={setIncludeContentStrategy}
                />
              </div>

              <div className="flex items-center justify-between py-2 border-t">
                <div className="space-y-0.5">
                  <Label>Industry Insights</Label>
                  <p className="text-sm text-muted-foreground">
                    Key takeaways from industry news and trends
                  </p>
                </div>
                <Switch
                  checked={includeInsights}
                  onCheckedChange={setIncludeInsights}
                />
              </div>

              <div className="flex items-center justify-between py-2 border-t">
                <div className="space-y-0.5">
                  <Label>Event Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Notifications about relevant industry events
                  </p>
                </div>
                <Switch
                  checked={includeEvents}
                  onCheckedChange={setIncludeEvents}
                />
              </div>

              <div className="flex items-center justify-between py-2 border-t">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label>Make Me Smarter</Label>
                    <Badge variant="secondary" className="text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Beta
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Allow KORA to send additional relevant content for RAG enhancement
                  </p>
                </div>
                <Switch
                  checked={makeMeSmarter}
                  onCheckedChange={setMakeMeSmarter}
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button>Save Telegram Preferences</Button>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Manage email and in-app notification preferences.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Email and in-app notification settings coming soon.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Account Tab */}
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Account Settings
              </CardTitle>
              <CardDescription>
                Manage your account and profile settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                For team and permissions settings, use Admin under System.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

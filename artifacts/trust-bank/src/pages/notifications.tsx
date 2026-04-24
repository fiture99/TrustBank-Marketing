import { useState } from "react";
import {
  useListNotifications,
  useSendNotification,
  useListNotificationTemplates,
  useListCampaigns,
} from "@workspace/api-client-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { formatRelative, cn } from "@/lib/utils";
import { Send, Smartphone, Mail, Bell as BellIcon, Users } from "lucide-react";

const CHANNEL_ICONS = {
  sms: Smartphone,
  email: Mail,
  in_app: BellIcon,
};

const AUDIENCE_LABELS: Record<string, string> = {
  all_customers: "All customers (≈12,480)",
  account_holders: "Account holders (≈7,320)",
  loan_clients: "Loan clients (≈1,240)",
  business_customers: "Business customers (≈540)",
  staff: "All staff (24)",
  custom: "Custom recipients",
};

export default function Notifications() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground">
          Send bulk SMS, email or in-app notifications. Browse history and templates.
        </p>
      </div>

      <Tabs defaultValue="send">
        <TabsList>
          <TabsTrigger value="send">Send</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="mt-6">
          <SendTab />
        </TabsContent>
        <TabsContent value="templates" className="mt-6">
          <TemplatesTab />
        </TabsContent>
        <TabsContent value="history" className="mt-6">
          <HistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SendTab() {
  const [channel, setChannel] = useState<"sms" | "email" | "in_app">("sms");
  const [audience, setAudience] = useState<
    "all_customers" | "account_holders" | "loan_clients" | "business_customers" | "staff" | "custom"
  >("account_holders");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [campaignId, setCampaignId] = useState<string>("");
  const [recipients, setRecipients] = useState("");
  const queryClient = useQueryClient();
  const { mutate, isPending } = useSendNotification();
  const { data: campaigns } = useListCampaigns();
  const { data: templates } = useListNotificationTemplates();
  const { toast } = useToast();

  const filteredTemplates = (templates ?? []).filter((t) => t.channel === channel);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Compose notification</CardTitle>
          <CardDescription>
            Select channel and audience, then write your message.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {(["sms", "email", "in_app"] as const).map((c) => {
              const Icon = CHANNEL_ICONS[c];
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setChannel(c)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border-2 p-4 transition-colors",
                    channel === c
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-primary/50",
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-medium uppercase">{c.replace("_", "-")}</span>
                </button>
              );
            })}
          </div>

          <div>
            <Label>Audience</Label>
            <Select value={audience} onValueChange={(v) => setAudience(v as typeof audience)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(AUDIENCE_LABELS).map(([k, l]) => (
                  <SelectItem key={k} value={k}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {audience === "custom" && (
            <div>
              <Label>Recipients (comma separated)</Label>
              <Textarea
                placeholder="+220 770 0001, +220 770 0002, ..."
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
              />
            </div>
          )}

          <div>
            <Label>Linked campaign (optional)</Label>
            <Select value={campaignId} onValueChange={setCampaignId}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                {(campaigns ?? []).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {channel !== "sms" && (
            <div>
              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
          )}

          <div>
            <Label>Message</Label>
            <Textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {message.length} characters{channel === "sms" ? ` · ~${Math.ceil(message.length / 160)} SMS` : ""}
            </p>
          </div>

          <Button
            onClick={() => {
              mutate(
                {
                  data: {
                    channel,
                    audience,
                    subject: subject || undefined,
                    message,
                    campaignId: campaignId ? Number(campaignId) : undefined,
                    recipients:
                      audience === "custom"
                        ? recipients.split(",").map((r) => r.trim()).filter(Boolean)
                        : undefined,
                  },
                },
                {
                  onSuccess: (res) => {
                    toast({
                      title: "Notification sent",
                      description: `Delivered to ${res.deliveredCount.toLocaleString()} recipients`,
                    });
                    setMessage("");
                    setSubject("");
                    queryClient.invalidateQueries();
                  },
                },
              );
            }}
            disabled={isPending || !message.trim()}
          >
            <Send className="mr-2 h-4 w-4" />
            {isPending ? "Sending…" : "Send notification"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Use a template</CardTitle>
          <CardDescription>Click to load into the composer</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {filteredTemplates.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No templates for this channel yet.
            </p>
          )}
          {filteredTemplates.map((t) => (
            <button
              key={t.id}
              type="button"
              className="w-full rounded-md border p-3 text-left text-sm hover:border-primary"
              onClick={() => {
                setSubject(t.subject ?? "");
                setMessage(t.body);
              }}
            >
              <div className="font-semibold">{t.name}</div>
              <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{t.body}</div>
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function TemplatesTab() {
  const { data: templates } = useListNotificationTemplates();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {(templates ?? []).map((t) => {
        const Icon = CHANNEL_ICONS[t.channel] ?? BellIcon;
        return (
          <Card key={t.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{t.name}</CardTitle>
                <Badge variant="outline" className="capitalize">
                  <Icon className="mr-1 h-3 w-3" /> {t.channel}
                </Badge>
              </div>
              {t.subject && <CardDescription>{t.subject}</CardDescription>}
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{t.body}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function HistoryTab() {
  const { data: notifications } = useListNotifications();

  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-muted-foreground">
              <th className="px-4 py-3 font-medium">Channel</th>
              <th className="px-4 py-3 font-medium">Recipient</th>
              <th className="px-4 py-3 font-medium">Subject / message</th>
              <th className="px-4 py-3 font-medium">Reach</th>
              <th className="px-4 py-3 font-medium">Sent by</th>
              <th className="px-4 py-3 font-medium">When</th>
            </tr>
          </thead>
          <tbody>
            {(notifications ?? []).map((n) => {
              const Icon = CHANNEL_ICONS[n.channel] ?? BellIcon;
              return (
                <tr key={n.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="capitalize">
                      <Icon className="mr-1 h-3 w-3" /> {n.channel.replace("_", "-")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{n.recipient}</td>
                  <td className="px-4 py-3">
                    {n.subject && <div className="font-medium">{n.subject}</div>}
                    <div className="line-clamp-1 text-muted-foreground">{n.message}</div>
                    {n.campaignName && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Campaign: {n.campaignName}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    <Users className="mr-1 inline h-3 w-3" />
                    {n.recipientCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{n.sentByName}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatRelative(n.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {(notifications ?? []).length === 0 && (
          <div className="py-12 text-center text-muted-foreground">No notifications yet.</div>
        )}
      </CardContent>
    </Card>
  );
}

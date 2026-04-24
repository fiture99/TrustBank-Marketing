import {
  useGetCurrentUser,
  useListUsers,
  useSetCurrentUser,
} from "@workspace/api-client-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { initials, cn } from "@/lib/utils";
import { LogOut, UserCheck } from "lucide-react";

export default function Settings() {
  const { data: me } = useGetCurrentUser();
  const { data: users } = useListUsers();
  const { mutate: switchUser, isPending } = useSetCurrentUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your demo profile and switch between team members.
        </p>
      </div>

      {me && (
        <Card>
          <CardHeader>
            <CardTitle>Current profile</CardTitle>
            <CardDescription>You are acting as this user.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-semibold text-white"
                style={{ backgroundColor: me.avatarColor }}
              >
                {initials(me.name)}
              </div>
              <div className="flex-1">
                <div className="text-lg font-semibold">{me.name}</div>
                <div className="text-sm text-muted-foreground">{me.email}</div>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {me.role}
                  </Badge>
                  {me.title && (
                    <span className="text-xs text-muted-foreground">{me.title}</span>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setLocation("/login")}
              >
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Switch profile</CardTitle>
          <CardDescription>
            This is a demo — pick any team member to see their view.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {(users ?? []).map((u) => {
              const isMe = u.id === me?.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  disabled={isMe || isPending}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border p-4 text-left transition-colors",
                    isMe
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary hover:bg-primary/5",
                  )}
                  onClick={() => {
                    switchUser(
                      { data: { userId: u.id } },
                      {
                        onSuccess: () => {
                          queryClient.invalidateQueries();
                          toast({
                            title: "Switched profile",
                            description: `Now acting as ${u.name}`,
                          });
                        },
                      },
                    );
                  }}
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white font-semibold"
                    style={{ backgroundColor: u.avatarColor }}
                  >
                    {initials(u.name)}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{u.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {u.role}
                    </div>
                  </div>
                  {isMe && <UserCheck className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About this demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Trust Bank Marketing & Sales Suite combines marketing campaign
            management, lead-to-deal sales tracking and bulk customer
            notifications in a single place.
          </p>
          <p>
            All currency is shown in Gambian Dalasi (D). Data is seeded from a
            Q2 2026 demo dataset.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

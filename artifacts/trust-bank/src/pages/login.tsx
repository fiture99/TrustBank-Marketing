import { useListUsers, useSetCurrentUser } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Login() {
  const { data: users, isLoading } = useListUsers();
  const { mutate: setUser } = useSetCurrentUser();
  const [, setLocation] = useLocation();

  if (isLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

  return (
    <div className="flex h-screen w-full items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-xl border-primary/10">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-3xl shadow-sm">
            TB
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Trust Bank</CardTitle>
          <CardDescription>Marketing & Sales Suite</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm font-medium text-muted-foreground text-center mb-2">
            Select a demo profile to continue
          </div>
          <div className="grid gap-3">
            {users?.map(user => (
              <Button
                key={user.id}
                variant="outline"
                className="h-auto w-full justify-start p-4 hover:border-primary hover:bg-primary/5 transition-all"
                onClick={() => {
                  setUser({ data: { userId: user.id } }, {
                    onSuccess: () => {
                      setLocation("/");
                    }
                  });
                }}
              >
                <div 
                  className="mr-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white font-medium shadow-sm"
                  style={{ backgroundColor: user.avatarColor }}
                >
                  {user.name.split(" ").map(n => n[0]).join("").substring(0, 2)}
                </div>
                <div className="flex flex-col items-start text-left">
                  <span className="font-semibold text-foreground">{user.name}</span>
                  <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

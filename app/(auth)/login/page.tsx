import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Log in</CardTitle>
        <CardDescription>Access your dashboard and inventory.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <LoginForm />
      </CardContent>
      <CardFooter className="flex flex-col border-t pt-6">
        <Alert variant="default" className="bg-muted/50 border-none">
          <InfoIcon className="h-4 w-4" />
          <AlertTitle className="text-sm font-semibold">Demo Access</AlertTitle>
          <AlertDescription className="text-xs space-y-1">
            <p>To explore the app without signing up, use:</p>
            <div className="font-mono bg-background/50 p-2 rounded border mt-1">
              <p>Email: demo@stockflow.test</p>
              <p>Password: Demo-User-2026!</p>
            </div>
          </AlertDescription>
        </Alert>
      </CardFooter>
    </Card>
  );
}

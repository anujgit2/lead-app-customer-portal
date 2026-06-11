import Link from "next/link";
import { Building2, Home, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary mb-6">
          <Building2 className="h-6 w-6 text-white" />
        </div>
        <Card className="border-0 shadow-xl shadow-gray-100/50">
          <CardContent className="p-8 flex flex-col items-center gap-5">
            <p className="text-5xl font-bold text-muted-foreground/40">404</p>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold">Page not found</h1>
              <p className="text-sm text-muted-foreground">
                The page you are looking for does not exist or has been moved.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full justify-center">
              <Button asChild className="gap-2">
                <Link href="/dashboard">
                  <Home className="h-4 w-4" />
                  Go to dashboard
                </Link>
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <Link href="/auth/login">
                  <LogIn className="h-4 w-4" />
                  Sign in
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

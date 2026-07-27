"use client";

import Link from "next/link";
import { authClient } from "@/auth-client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { data: session, isPending } = authClient.useSession();

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>Media Gallery</CardTitle>
          <CardDescription>
            Next.js + Docker App with Better Auth
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {!isPending && session ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm">
                Signed in as <span className="font-semibold">{session.user.email}</span>
              </p>
              <Link href="/dashboard" className="w-full">
                <Button className="w-full">Go to Dashboard</Button>
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Link href="/sign-in" className="w-full">
                <Button className="w-full">Sign In</Button>
              </Link>
              <Link href="/sign-up" className="w-full">
                <Button variant="outline" className="w-full">
                  Sign Up
                </Button>
              </Link>
            </div>
          )}
        </CardContent>

        <CardFooter className="justify-center border-t pt-4">
          <p className="text-xs text-muted-foreground">
            Accessible on all local network IP addresses.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

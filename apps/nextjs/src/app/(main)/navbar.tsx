"use client";

import Link from "next/link";
import { redirect, usePathname } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@splashin/ui/avatar";
import { Button } from "@splashin/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@splashin/ui/dropdown-menu";

import { authClient } from "~/auth/client";
import { VolantirLogo } from "~/components/logo";

const tabs: {
  label: string;
  href: string;
  allowSubPaths?: boolean;
  matcher?: RegExp;
}[] = [
  {
    label: "Map",
    href: "/map",
  },
  {
    label: "Location",
    href: "/",
    allowSubPaths: false,
  },
  {
    label: "Targets",
    href: "/targets",
  },
  {
    label: "Setup",
    href: "/setup",
  },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  if (!isPending && !session) {
    return redirect("/signin");
  }
  console.log(session);

  return (
    <div className="flex w-full justify-center">
      <div className="bg-background/80 fixed top-0 z-50 flex w-full max-w-4xl flex-col justify-between border-x border-b backdrop-blur-md">
        <div className="flex h-16 w-full items-center justify-between px-4 py-4">
          <Link
            prefetch
            href="/"
            className="flex h-full w-32 items-center justify-center"
          >
            <VolantirLogo />
          </Link>
          <div>
            {isPending ? null : session ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="rounded-full">
                  <Avatar>
                    <AvatarImage src={session.user.image ?? ""} />
                    <AvatarFallback>
                      {session.user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => authClient.signOut()}>
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                size="sm"
                onClick={() => authClient.signIn.social({ provider: "google" })}
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
        <div className="flex w-full divide-x border-t [&>*]:bg-none [&>*:last-child]:border-r">
          {tabs.map((tab) => (
            <Button
              asChild
              key={tab.label + tab.href}
              variant={
                (
                  tab.matcher
                    ? tab.matcher.test(pathname)
                    : tab.allowSubPaths
                      ? pathname.startsWith(tab.href)
                      : pathname === tab.href
                )
                  ? "default"
                  : "ghost"
              }
              size="sm"
            >
              <Link href={tab.href}>{tab.label}</Link>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@splashin/ui/button";

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
];

export function Navbar() {
  const pathname = usePathname();
  return (
    <div className="flex w-full justify-center">
      <div className="sticky top-0 flex w-full max-w-4xl flex-col justify-between border-x border-b backdrop-blur-xs">
        <div className="flex w-full items-center justify-between px-4 py-4">
          <Link
            prefetch
            href="/"
            className="flex h-full w-32 items-center justify-center"
          >
            <VolantirLogo />
          </Link>
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

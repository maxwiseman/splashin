import { Navbar } from "./navbar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="size-full">
      <Navbar />
      {children}
    </div>
  );
}

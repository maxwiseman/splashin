import { Navbar } from "./navbar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex size-full flex-col">
      <Navbar />
      <div className="contents [&>*]:mt-[6.125rem]">{children}</div>
    </div>
  );
}

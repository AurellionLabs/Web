import { PoolsProvider } from "@/app/providers/pools.provider";

export default function PoolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PoolsProvider>{children}</PoolsProvider>;
}

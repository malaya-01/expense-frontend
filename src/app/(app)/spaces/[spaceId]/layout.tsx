export function generateStaticParams() {
  return [{ spaceId: "_" }];
}

export default function SpaceIdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

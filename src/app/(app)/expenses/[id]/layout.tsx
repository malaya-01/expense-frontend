export function generateStaticParams() {
  return [{ id: "_" }];
}

export default function ExpenseIdLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

"use client";

import { useParams } from "next/navigation";
import { EditTransaction } from "../edit/edit-transaction";

// Legacy web URL (/expenses/<id>). Prefer /expenses/edit?id=<id>, which also
// works in the Android static export.
export default function EditExpensePage() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  return <EditTransaction key={id} transactionId={id} />;
}

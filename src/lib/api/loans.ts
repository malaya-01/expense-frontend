import type {
  CreateLoanInput,
  Loan,
  LoanAmortizationRow,
} from "@/types";
import { api, unwrap } from "./client";

export async function listLoans(): Promise<Loan[]> {
  const response = await api.get("/loans");
  const data = unwrap<Loan[] | Loan>(response);
  return Array.isArray(data) ? data : data ? [data] : [];
}

export async function createLoan(input: CreateLoanInput): Promise<Loan> {
  const response = await api.post("/loans", input);
  return unwrap<Loan>(response);
}

export async function updateLoan(
  id: string,
  input: Partial<CreateLoanInput> & { status?: Loan["status"] },
): Promise<Loan> {
  const response = await api.patch(`/loans/${id}`, input);
  return unwrap<Loan>(response);
}

export async function archiveLoan(id: string): Promise<void> {
  await api.delete(`/loans/${id}`);
}

export async function recordLoanPayment(
  id: string,
  input: {
    source_container_id: string;
    amount: number;
    date: string;
    exchange_rate?: number;
    notes?: string;
  },
): Promise<{ loan: Loan }> {
  const response = await api.post(`/loans/${id}/payments`, input);
  return unwrap<{ loan: Loan }>(response);
}

export async function getLoanAmortization(
  id: string,
): Promise<LoanAmortizationRow[]> {
  const response = await api.get(`/loans/${id}/amortization`);
  const data = unwrap<LoanAmortizationRow[]>(response);
  return Array.isArray(data) ? data : [];
}

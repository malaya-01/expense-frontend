import type {
  CreateLoanInput,
  Loan,
  LoanAmortizationRow,
} from "@/types";
import { api, unwrap } from "./client";
import { loanPaymentLocal, loansRepo } from "@/lib/offline/repos";
import { isOnline } from "@/lib/offline/network";

export async function listLoans(): Promise<Loan[]> {
  return (await loansRepo.list()) as Loan[];
}

export async function createLoan(input: CreateLoanInput): Promise<Loan> {
  return (await loansRepo.create(input as any)) as Loan;
}

export async function updateLoan(
  id: string,
  input: Partial<CreateLoanInput> & { status?: Loan["status"] },
): Promise<Loan> {
  return (await loansRepo.update(id, input as any)) as Loan;
}

export async function archiveLoan(id: string): Promise<void> {
  await loansRepo.remove(id);
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
  if (isOnline()) {
    try {
      const response = await api.post(`/loans/${id}/payments`, input);
      return unwrap<{ loan: Loan }>(response);
    } catch {
      /* queue offline */
    }
  }
  await loanPaymentLocal(id, input);
  const loan = (await loansRepo.get(id).catch(() => ({ id }))) as Loan;
  return { loan };
}

export async function getLoanAmortization(
  id: string,
): Promise<LoanAmortizationRow[]> {
  const response = await api.get(`/loans/${id}/amortization`);
  const data = unwrap<LoanAmortizationRow[]>(response);
  return Array.isArray(data) ? data : [];
}

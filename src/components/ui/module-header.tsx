import type { ReactNode } from "react";
import { Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function ModuleHeader({
  title,
  description,
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  filter,
  onFilterChange,
  filterOptions,
  filterLabel = "Filter",
  actions,
}: {
  title: string;
  description: string;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filter?: string;
  onFilterChange?: (value: string) => void;
  filterOptions?: Array<{ value: string; label: string }>;
  filterLabel?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-[28px] font-semibold tracking-[-0.04em] text-[var(--ds-gray-1000)] sm:text-[32px]">
          {title}
        </h1>
        <p className="mt-1 max-w-xl text-sm text-[var(--ds-gray-700)]">
          {description}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {onSearchChange ? (
          <div className="relative min-w-0 flex-1 sm:w-56 sm:flex-none">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ds-gray-700)]"
            />
            <Input
              value={search || ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-8"
              aria-label={searchPlaceholder}
            />
          </div>
        ) : null}
        {onFilterChange && filterOptions?.length ? (
          <div className="relative sm:w-44">
            <Filter
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-[var(--ds-gray-700)]"
            />
            <Select
              value={filter || filterOptions[0]?.value}
              onChange={(e) => onFilterChange(e.target.value)}
              className="pl-8"
              aria-label={filterLabel}
            >
              {filterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
        {actions}
      </div>
    </div>
  );
}

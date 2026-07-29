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
    <div className="mb-4 flex flex-col gap-2.5 sm:mb-5 sm:gap-3 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <h1 className="text-[22px] font-semibold tracking-[-0.04em] text-[var(--ds-gray-1000)] sm:text-[28px]">
          {title}
        </h1>
        <p className="mt-0.5 line-clamp-2 max-w-xl text-xs text-[var(--ds-gray-700)] sm:mt-1 sm:line-clamp-none sm:text-sm">
          {description}
        </p>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2 sm:flex sm:flex-row sm:items-center">
        {onSearchChange ? (
          <div className="relative min-w-0 sm:w-56 sm:flex-none">
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
          <div className="relative min-w-[7.5rem] sm:w-44">
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
        {actions ? (
          <div className="col-span-2 sm:col-span-1 sm:contents">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}

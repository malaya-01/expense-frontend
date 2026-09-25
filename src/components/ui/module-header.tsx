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
  const hasSearchOrFilter = Boolean(onSearchChange || onFilterChange);

  return (
    <div className="mb-3 sm:mb-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-heading text-[22px] font-semibold tracking-[-0.04em] text-[var(--ds-gray-1000)] sm:text-[28px]">
            {title}
          </h1>
          <p className="mt-1 line-clamp-2 max-w-2xl text-[13px] leading-5 text-[var(--ds-gray-700)] sm:line-clamp-none sm:text-sm">
            {description}
          </p>
        </div>
        {actions && !hasSearchOrFilter ? (
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            {actions}
          </div>
        ) : null}
      </div>

      {hasSearchOrFilter ? (
        <div className="mt-2.5 flex items-center gap-2 sm:mt-3">
          {onSearchChange ? (
            <div className="min-w-0 flex-1 sm:max-w-xs sm:flex-none sm:w-56">
              <Input
                value={search || ""}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                startAdornment={<Search size={14} aria-hidden />}
                className="h-10"
              />
            </div>
          ) : null}
          {onFilterChange && filterOptions?.length ? (
            <div className="w-[8.5rem] shrink-0 sm:w-44">
              <Select
                value={filter || filterOptions[0]?.value}
                onChange={(e) => onFilterChange(e.target.value)}
                aria-label={filterLabel}
                startAdornment={<Filter size={14} aria-hidden />}
                className="h-10"
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
            <div className="ml-auto flex shrink-0 items-center gap-2 [&_button]:h-10 [&_button]:justify-center [&_button]:px-3 [&_button]:text-[12px] sm:[&_button]:px-4 sm:[&_button]:text-[13px]">
              {actions}
            </div>
          ) : null}
        </div>
      ) : null}

      {actions && !hasSearchOrFilter ? (
        <div className="mt-2.5 flex items-center gap-2 sm:hidden [&_button]:h-10 [&_button]:flex-1 [&_button]:justify-center [&_button]:px-3 [&_button]:text-[12px]">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

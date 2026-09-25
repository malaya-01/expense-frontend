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
    <div className="mb-3 sm:mb-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-[20px] font-semibold tracking-[-0.04em] text-[var(--ds-gray-1000)] sm:text-[28px]">
            {title}
          </h1>
          <p className="mt-0.5 line-clamp-1 max-w-xl text-[11px] leading-4 text-[var(--ds-gray-700)] sm:mt-1 sm:line-clamp-none sm:text-sm sm:leading-5">
            {description}
          </p>
        </div>
        {actions ? (
          <div className="hidden shrink-0 sm:flex sm:items-center sm:gap-2">
            {actions}
          </div>
        ) : null}
      </div>

      {onSearchChange || onFilterChange ? (
        <div className="mt-2.5 flex items-center gap-2 sm:mt-3">
          {onSearchChange ? (
            <div className="min-w-0 flex-1 sm:max-w-xs sm:flex-none sm:w-56">
              <Input
                value={search || ""}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                startAdornment={<Search size={14} aria-hidden />}
                className="h-9 sm:h-10"
              />
            </div>
          ) : null}
          {onFilterChange && filterOptions?.length ? (
            <div className="w-[7.25rem] shrink-0 sm:w-44">
              <Select
                value={filter || filterOptions[0]?.value}
                onChange={(e) => onFilterChange(e.target.value)}
                aria-label={filterLabel}
                startAdornment={<Filter size={14} aria-hidden />}
                className="h-9 sm:h-10"
              >
                {filterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
        </div>
      ) : null}

      {actions ? (
        <div className="mt-2 flex sm:hidden [&_button]:h-9 [&_button]:w-full">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

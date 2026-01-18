import { useState, useMemo } from "react";
import { Search, X, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export interface FilterState {
  searchText: string;
  categories: string[];
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

interface SearchFilterBarProps {
  onFilterChange: (filters: FilterState) => void;
}

const CATEGORIES = [
  { value: "restaurant", label: "Restaurant" },
  { value: "hotel", label: "Hotel" },
  { value: "museum", label: "Museum" },
  { value: "park", label: "Park" },
  { value: "shopping", label: "Shopping" },
  { value: "landmark", label: "Landmark" },
  { value: "transport", label: "Transport" },
];

export function SearchFilterBar({ onFilterChange }: SearchFilterBarProps) {
  const [searchText, setSearchText] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchText) count++;
    if (selectedCategories.length > 0) count++;
    if (dateRange.from || dateRange.to) count++;
    return count;
  }, [searchText, selectedCategories, dateRange]);

  const handleSearchChange = (value: string) => {
    setSearchText(value);
    onFilterChange({
      searchText: value,
      categories: selectedCategories,
      dateRange,
    });
  };

  const handleCategoryToggle = (category: string) => {
    const newCategories = selectedCategories.includes(category)
      ? selectedCategories.filter((c) => c !== category)
      : [...selectedCategories, category];

    setSelectedCategories(newCategories);
    onFilterChange({
      searchText,
      categories: newCategories,
      dateRange,
    });
  };

  const handleDateRangeChange = (range: { from: Date | undefined; to: Date | undefined }) => {
    setDateRange(range);
    onFilterChange({
      searchText,
      categories: selectedCategories,
      dateRange: range,
    });
  };

  const handleClearAll = () => {
    setSearchText("");
    setSelectedCategories([]);
    setDateRange({ from: undefined, to: undefined });
    onFilterChange({
      searchText: "",
      categories: [],
      dateRange: { from: undefined, to: undefined },
    });
  };

  return (
    <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-col gap-2 md:flex-row md:items-center">
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search artifacts by name or description..."
            value={searchText}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 pr-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
          />
          {searchText && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => handleSearchChange("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {/* Category Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
            >
              <Filter className="h-4 w-4 mr-2" />
              Categories
              {selectedCategories.length > 0 && (
                <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-xs">
                  {selectedCategories.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="start">
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Filter by Category</h4>
              <div className="space-y-2">
                {CATEGORIES.map((category) => (
                  <div key={category.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={category.value}
                      checked={selectedCategories.includes(category.value)}
                      onCheckedChange={() => handleCategoryToggle(category.value)}
                    />
                    <Label
                      htmlFor={category.value}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {category.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Date Range Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
            >
              Date Range
              {(dateRange.from || dateRange.to) && (
                <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-xs">
                  ✓
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3">
              <h4 className="font-medium text-sm mb-3">Filter by Date</h4>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">From</Label>
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) =>
                      handleDateRangeChange({ ...dateRange, from: date })
                    }
                    disabled={(date) =>
                      date > new Date() || (dateRange.to && date > dateRange.to)
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) =>
                      handleDateRangeChange({ ...dateRange, to: date })
                    }
                    disabled={(date) =>
                      date > new Date() || (dateRange.from && date < dateRange.from)
                    }
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Clear All Button */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
          >
            <X className="h-4 w-4 mr-2" />
            Clear All ({activeFilterCount})
          </Button>
        )}
      </div>
    </div>
  );
}

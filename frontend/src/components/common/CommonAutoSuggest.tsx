import { useState, useEffect, useRef } from "react";

export interface DropdownOption {
  label: string ;
  id: number | string;
}

interface CommonAutoSuugest {
  title: string;
  onSelect: (item: DropdownOption) => void;
  fetchSuggestions: (query: string) => Promise<DropdownOption[]>; // Generic fetch
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  value?: string; // Added value prop
}

export const AutoSuggestInputCommon: React.FC<CommonAutoSuugest> = ({
  title,
  onSelect,
  fetchSuggestions,
  placeholder = "Search...",
  required = false,
  disabled = false,
  value = "", // Added value prop with default
}) => {
  const [inputValue, setInputValue] = useState(value); // Initialize with value prop
  const [debouncedValue, setDebouncedValue] = useState("");
  const [suggestions, setSuggestions] = useState<DropdownOption[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value); // Track selected option label
  const listRef = useRef<HTMLUListElement>(null);

  // Update input value when value prop changes
  useEffect(() => {
    setInputValue(value);
    setSelectedValue(value);
  }, [value]);

  // Debounce input value
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(inputValue), 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // Fetch suggestions when debouncedValue changes and differs from selectedValue
  useEffect(() => {
    if (debouncedValue.length > 1 && debouncedValue !== selectedValue) {
      setIsLoading(true);
      fetchSuggestions(debouncedValue)
        .then((data) => {
          setSuggestions(
            data.length > 0 ? data : [{ id: 0, label: "No results found" }]
          );
          setIsVisible(true);
        })
        .catch((error) => {
          console.error("Error fetching suggestions:", error);
          setSuggestions([{ id: 0, label: "Error loading suggestions" }]);
          setIsVisible(true);
        })
        .finally(() => setIsLoading(false));
    } else {
      setSuggestions([]);
      setIsVisible(false);
    }
  }, [debouncedValue, fetchSuggestions, selectedValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      if (suggestions[selectedIndex].id !== 0) { // Don't select "No results found"
        handleSelect(suggestions[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsVisible(false);
      setSelectedIndex(-1);
    }
  };

  const handleSelect = (item: DropdownOption) => {
    if (item.id === 0) return; // Don't select "No results found" or error messages
    
    setInputValue(item.label);
    setSelectedValue(item.label);
    onSelect(item);
    setSuggestions([]);
    setIsVisible(false);
    setSelectedIndex(-1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSelectedIndex(-1);
    
    // Only clear selectedValue if user is typing something different
    if (newValue !== selectedValue) {
      setSelectedValue("");
    }
  };

  const handleInputFocus = () => {
    // Show suggestions if there's text and no selection
    if (inputValue.length > 1 && inputValue !== selectedValue) {
      setIsVisible(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding to allow for click selection
    setTimeout(() => {
      setIsVisible(false);
      setSelectedIndex(-1);
    }, 150);
  };

  return (
    <div className="relative w-full min-w-[180px] self-stretch">
      <h3 className="mb-0.5 w-full text-xs font-semibold text-slate-700">
        {title} {required && <span className="text-red-500">*</span>}
      </h3>

      <div
        className={`group flex mt-2.5 items-center rounded-xl border-2 bg-white ${
          disabled
            ? "cursor-default bg-slate-200"
            : "cursor-text border-slate-300 focus-within:border-slate-500"
        }`}
      >
        <input
          type="text"
          placeholder={placeholder}
          value={inputValue}
          disabled={disabled}
          readOnly={disabled}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className="w-full px-3 py-3 text-sm font-medium text-slate-600 focus:outline-none  disabled:cursor-not-allowed"
        />
        
        {isLoading && (
          <div className="px-3">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"></div>
          </div>
        )}
      </div>

      {isVisible && suggestions.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-slate-300 bg-white shadow-md"
        >
          {suggestions.map((item, index) => (
            <li
              key={`${item.id}-${index}`}
              onClick={() => handleSelect(item)}
              className={`flex cursor-pointer px-3 py-2 text-sm font-medium ${
                index === selectedIndex 
                  ? "bg-purple-200" 
                  : item.id === 0 
                    ? "text-slate-500 cursor-default" 
                    : "hover:bg-gray-100"
              }`}
            >
              {item.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
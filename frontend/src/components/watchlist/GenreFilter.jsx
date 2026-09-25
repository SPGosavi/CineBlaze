import { useState, useEffect, useRef } from "react";
import { Filter, ChevronDown, Check } from "lucide-react";

/** Dropdown for filtering the watchlist by genre. Closes on outside click. */
const GenreFilter = ({ genres, selected, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target))
        setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative z-[60]" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
                    flex items-center gap-2 px-4 py-2 rounded-xl transition-all shadow-sm text-sm font-medium min-w-[140px] justify-between group
                    ${isOpen ? "bg-neutral-800 text-white ring-1 ring-white/10" : "bg-transparent text-gray-300 hover:text-white hover:bg-white/5"}
                `}
      >
        <div className="flex items-center gap-2">
          <Filter
            size={14}
            className={selected === "All" ? "text-gray-500" : "text-orange-500"}
          />
          <span>{selected}</span>
        </div>
        <ChevronDown
          size={14}
          className={`text-gray-500 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full md:top-full mt-2 w-56 max-h-[60vh] overflow-y-auto bg-neutral-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl animate-fade-in z-[9999]">
          <div className="max-h-64 overflow-y-auto scrollbar-thin p-1.5 space-y-0.5">
            {genres.map((genre) => (
              <button
                key={genre}
                onClick={() => {
                  onChange(genre);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between ${
                  selected === genre
                    ? "bg-gradient-to-r from-red-600/20 to-orange-600/20 text-white font-semibold"
                    : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                }`}
              >
                {genre}
                {selected === genre && (
                  <Check size={14} className="text-orange-500" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GenreFilter;

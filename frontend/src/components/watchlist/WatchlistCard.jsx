import { useState } from "react";
import Poster from "../ui/Poster";
import { sanitizeItem } from "../../utils/sanitize";

/** Draggable watchlist entry. Supports drop-on-card for reordering. */
const WatchlistCard = ({ item, onDragStart, onDropItem, onExpand }) => {
  const [isOver, setIsOver] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  if (!item || !item.id) return null;
  const safeItem = sanitizeItem(item);

  const handleDragStart = (e) => {
    e.dataTransfer.setData("text/plain", safeItem.id);
    e.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
    onDragStart(e, safeItem.id);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);
    onDropItem(safeItem.id);
  };

  const year = safeItem.release_date.split("-")[0] || "N/A";

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => onExpand(safeItem)}
      className={`
            bg-neutral-800 p-2.5 rounded-xl mb-3 cursor-grab active:cursor-grabbing 
            flex gap-3 hover:bg-neutral-750 transition-all shadow-sm border 
            ${isOver ? "border-blue-500 scale-[1.02] ring-2 ring-blue-500/20 z-10" : "border-neutral-700 hover:border-red-500/30"}
            ${isDragging ? "opacity-50 border-dashed border-gray-500" : "opacity-100"}
            group touch-manipulation relative
          `}
    >
      <Poster
        path={safeItem.poster_path}
        alt={safeItem.title}
        className="w-14 h-20 rounded-lg object-cover flex-shrink-0 shadow-md"
      />
      <div className="flex flex-col justify-center overflow-hidden flex-1 min-w-0">
        <h4 className="font-bold text-gray-200 text-sm truncate leading-snug group-hover:text-red-400 transition-colors">
          {safeItem.title || "Untitled"}
        </h4>
        <span className="text-xs text-orange-500 font-medium mb-1.5">
          {year}
        </span>
        <div className="flex flex-wrap gap-1">
          {Array.isArray(safeItem.genres) && safeItem.genres.length > 0 ? (
            safeItem.genres.slice(0, 2).map((g, i) => (
              <span
                key={i}
                className="text-[8px] bg-neutral-900 text-gray-500 px-1.5 py-0.5 rounded border border-neutral-800 uppercase tracking-wide"
              >
                {typeof g === "object" ? g.name : g}
              </span>
            ))
          ) : (
            <span className="text-[8px] text-gray-600">No Genre</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default WatchlistCard;

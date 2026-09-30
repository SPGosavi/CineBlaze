import WatchlistCard from "./WatchlistCard";

/** One status column ("Want", "Watching", "Watched") of the watchlist board. */
const KanbanColumn = ({
  title,
  status,
  items,
  onDropColumn,
  onDragOver,
  onDragStart,
  onDropItem,
  onExpand,
}) => (
  <div
    className="flex-1 bg-neutral-900/50 rounded-xl p-4 min-w-full md:min-w-[280px] flex flex-col border border-neutral-800/50 md:h-full h-auto"
    onDragOver={onDragOver}
    onDrop={(e) => onDropColumn(e, status)}
  >
    <h3 className="font-bold text-gray-400 mb-4 flex items-center justify-between uppercase tracking-wider text-xs sticky top-0 bg-neutral-900/90 p-2 rounded-lg backdrop-blur-sm z-10 border-b border-neutral-800">
      {title}
      <span className="bg-red-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
        {items.length}
      </span>
    </h3>
    <div className="flex-1 md:overflow-y-auto md:min-h-[200px] scrollbar-thin pr-1 pb-4">
      {items.map((item, index) => (
        <WatchlistCard
          key={`${item?.id || "missing-" + index}`}
          item={item}
          onDragStart={onDragStart}
          onDropItem={onDropItem}
          onExpand={onExpand}
        />
      ))}
      {items.length === 0 && (
        <div className="h-24 md:h-32 flex items-center justify-center border-2 border-dashed border-neutral-800 rounded-xl text-neutral-600 text-sm bg-neutral-900/30">
          Drag &amp; Drop Here
        </div>
      )}
    </div>
  </div>
);

export default KanbanColumn;

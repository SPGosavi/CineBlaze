import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Horizontally scrollable row with gradient arrow controls that fade in only
 * when there is more content to scroll to in that direction.
 */
const HorizontalScrollContainer = ({ children, className = "" }) => {
  const scrollRef = useRef(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeft(scrollLeft > 0);
      setShowRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [children]);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const { clientWidth } = scrollRef.current;
      const scrollAmount =
        direction === "left" ? -clientWidth * 0.75 : clientWidth * 0.75;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  return (
    <div className={`relative group/scroll ${className}`}>
      <button
        onClick={() => scroll("left")}
        className={`absolute left-0 top-0 bottom-0 z-20 w-8 md:w-12 bg-gradient-to-r from-black via-black/70 to-transparent flex items-center justify-center transition-opacity duration-300 ${showLeft ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <ChevronLeft
          size={32}
          className="text-white drop-shadow-lg hover:text-red-500 transition-colors"
        />
      </button>
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex overflow-x-auto gap-4 pb-4 scroll-smooth scrollbar-hide"
      >
        {children}
      </div>
      <button
        onClick={() => scroll("right")}
        className={`absolute right-0 top-0 bottom-0 z-20 w-8 md:w-12 bg-gradient-to-l from-black via-black/70 to-transparent flex items-center justify-center transition-opacity duration-300 ${showRight ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <ChevronRight
          size={32}
          className="text-white drop-shadow-lg hover:text-red-500 transition-colors"
        />
      </button>
    </div>
  );
};

export default HorizontalScrollContainer;

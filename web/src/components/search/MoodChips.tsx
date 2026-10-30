import Link from "next/link";

interface MoodChip {
  label: string;
  query: string;
}

const MOOD_CHIPS: MoodChip[] = [
  {
    label: "Dark & Mysterious",
    query: "dark mysterious thriller in a rainy city",
  },
  {
    label: "Feel Good",
    query: "feel good uplifting movie to relax",
  },
  {
    label: "Mind-Bending",
    query: "mind bending psychological sci-fi",
  },
  {
    label: "Heartwarming",
    query: "heartwarming family drama",
  },
  {
    label: "Intense Thriller",
    query: "intense gripping thriller",
  },
  {
    label: "Epic Adventure",
    query: "epic adventure with grand scale",
  },
];

export default function MoodChips() {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold tracking-wide text-gray-300/90 uppercase">
        Pick a mood
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {MOOD_CHIPS.map((chip) => (
          <Link
            key={chip.label}
            href={{
              pathname: "/search",
              query: { mode: "recommend", q: chip.query },
            }}
            className="rounded-full border border-white/20 bg-black/30 px-3 py-1.5 text-xs font-medium text-gray-200 transition hover:border-orange-400/60 hover:text-orange-200"
          >
            {chip.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

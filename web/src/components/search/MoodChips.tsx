import Link from "next/link";
import Label from "@/components/ui/Label";

interface MoodChip {
  label: string;
  query: string;
}

const MOOD_CHIPS: MoodChip[] = [
  {
    label: "Dark & mysterious",
    query: "dark mysterious thriller in a rainy city",
  },
  {
    label: "Feel good",
    query: "feel good uplifting movie to relax",
  },
  {
    label: "Mind-bending",
    query: "mind bending psychological sci-fi",
  },
  {
    label: "Heartwarming",
    query: "heartwarming family drama",
  },
  {
    label: "Intense thriller",
    query: "intense gripping thriller",
  },
  {
    label: "Epic adventure",
    query: "epic adventure with grand scale",
  },
];

export default function MoodChips() {
  return (
    <div className="space-y-2">
      <Label size="xs" className="block text-center text-muted">
        Pick a mood
      </Label>
      <div className="flex flex-wrap justify-center gap-2">
        {MOOD_CHIPS.map((chip) => (
          <Link
            key={chip.label}
            href={{
              pathname: "/search",
              query: { mode: "recommend", q: chip.query },
            }}
            className="rounded-full border border-rule bg-paper-2 px-3 py-1 font-body text-xs font-medium text-ink transition-colors hover:border-muted/50 hover:bg-paper-3 focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2 active:translate-y-[1px]"
          >
            {chip.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

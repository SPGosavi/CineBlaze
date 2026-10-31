"use client";

import React from "react";
import Button from "@/components/ui/Button";
import Label from "@/components/ui/Label";
import Well from "@/components/ui/Well";
import Frame from "@/components/ui/Frame";
import Figure from "@/components/ui/Figure";
import Rating from "@/components/ui/Rating";
import Pill from "@/components/ui/Pill";
import { Film, Sparkles } from "lucide-react";

export default function PreviewPage() {
  return (
    <div className="min-h-screen bg-paper text-ink p-8 space-y-12 max-w-5xl mx-auto">
      <div>
        <h1 className="font-display text-3xl font-medium mb-2">
          UI Primitives Eight-State Preview
        </h1>
        <Label size="sm">
          Mechanical verification of the eight states across all seven
          primitives.
        </Label>
      </div>

      {/* Button states */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-medium border-b border-rule pb-2">
          1. Button (ember, ghost, quiet)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label size="xs">Default (app)</Label>
            <div>
              <Button variant="ember" size="app">
                Explore Titles
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label size="xs">Default (ghost)</Label>
            <div>
              <Button variant="ghost" size="app">
                Save to List
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label size="xs">Default (quiet)</Label>
            <div>
              <Button variant="quiet" size="app">
                Skip
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label size="xs">Page Size</Label>
            <div>
              <Button variant="ember" size="page">
                Get Started
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label size="xs">Loading</Label>
            <div>
              <Button variant="ember" isLoading size="app">
                Searching…
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label size="xs">Disabled</Label>
            <div>
              <Button variant="ember" disabled size="app">
                Unavailable
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label size="xs">Success</Label>
            <div>
              <Button variant="ghost" isSuccess size="app">
                Saved!
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <Label size="xs">Error</Label>
            <div>
              <Button variant="ghost" isError size="app">
                Retry Action
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Label element */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-medium border-b border-rule pb-2">
          2. Label (replaces 21 eyebrows)
        </h2>
        <div className="flex flex-wrap gap-6 items-baseline">
          <div>
            <Label size="xs">Metadata Tag (12px)</Label>
            <p className="font-body text-sm mt-1">
              2026 / 148m / Christopher Nolan
            </p>
          </div>
          <div>
            <Label size="sm">Section Heading (14px)</Label>
            <p className="font-body text-sm mt-1">
              Streaming on Netflix, Prime Video
            </p>
          </div>
          <div>
            <Label as="dt" size="xs">
              Director
            </Label>
            <dd className="font-body text-sm text-ink font-medium">
              Denis Villeneuve
            </dd>
          </div>
        </div>
      </section>

      {/* Well */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-medium border-b border-rule pb-2">
          3. Well (single containment layer)
        </h2>
        <Well>
          <div className="flex items-center gap-3">
            <Sparkles
              className="w-5 h-5 text-accent shrink-0"
              aria-hidden="true"
            />
            <div>
              <h3 className="font-display font-medium text-ink">
                Personalized recommendations
              </h3>
              <p className="font-body text-sm text-muted mt-0.5">
                Calculated from your watched titles and preferred subgenres.
              </p>
            </div>
          </div>
        </Well>
      </section>

      {/* Frame & Poster */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-medium border-b border-rule pb-2">
          4. Frame (28px radius, 1px cream inset ring)
        </h2>
        <div className="flex gap-6">
          <div className="w-36">
            <Frame aspectRatio="poster" hasScrim>
              <div className="w-full h-full bg-paper-3 flex flex-col items-center justify-center p-3 text-center">
                <Film className="w-8 h-8 text-muted mb-2" aria-hidden="true" />
                <Label size="xs">Poster Frame</Label>
              </div>
            </Frame>
          </div>
          <div className="w-64">
            <Frame aspectRatio="backdrop" hasScrim>
              <div className="w-full h-full bg-paper-3 flex flex-col items-center justify-center p-3 text-center">
                <Film className="w-8 h-8 text-muted mb-2" aria-hidden="true" />
                <Label size="xs">Backdrop Frame</Label>
              </div>
            </Frame>
          </div>
        </div>
      </section>

      {/* Figure */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-medium border-b border-rule pb-2">
          5. Figure (tabular lining numerals in Boska)
        </h2>
        <div className="flex flex-wrap gap-8 items-baseline">
          <div>
            <Label size="xs">Year</Label>
            <div>
              <Figure value="2026" size="lg" />
            </div>
          </div>
          <div>
            <Label size="xs">Runtime</Label>
            <div>
              <Figure value="148" unit="min" size="lg" />
            </div>
          </div>
          <div>
            <Label size="xs">Watchlist Count</Label>
            <div>
              <Figure value="42" size="xl" className="text-accent" />
            </div>
          </div>
        </div>
      </section>

      {/* Rating signature */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-medium border-b border-rule pb-2">
          6. Rating (the signature: heat ramp temperature)
        </h2>
        <div className="flex flex-wrap gap-6 items-baseline">
          <div>
            <Label size="xs">&lt; 5.0 (oxblood)</Label>
            <div>
              <Rating score={4.2} source="IMDb" size="lg" />
            </div>
          </div>
          <div>
            <Label size="xs">5.0–6.4 (low)</Label>
            <div>
              <Rating score={5.8} source="IMDb" size="lg" />
            </div>
          </div>
          <div>
            <Label size="xs">6.5–7.4 (ember)</Label>
            <div>
              <Rating score={7.1} source="IMDb" size="lg" />
            </div>
          </div>
          <div>
            <Label size="xs">7.5–8.4 (amber)</Label>
            <div>
              <Rating score={8.2} source="TMDB" size="lg" />
            </div>
          </div>
          <div>
            <Label size="xs">8.5+ (white heat)</Label>
            <div>
              <Rating score={9.1} source="RT" size="lg" />
            </div>
          </div>
          <div>
            <Label size="xs">Unrated</Label>
            <div>
              <Rating score={null} source="TMDB" size="lg" />
            </div>
          </div>
        </div>
      </section>

      {/* Pill */}
      <section className="space-y-4">
        <h2 className="font-display text-xl font-medium border-b border-rule pb-2">
          7. Pill (filter chips, genres, moods)
        </h2>
        <div className="flex flex-wrap gap-3">
          <Pill>Sci-Fi</Pill>
          <Pill selected>Psychological Thriller</Pill>
          <Pill onRemove={() => {}} removeLabel="Remove Noir">
            Film Noir
          </Pill>
          <Pill disabled>Documentary</Pill>
          <Pill size="sm">1990s</Pill>
          <Pill size="sm" selected>
            2020s
          </Pill>
        </div>
      </section>
    </div>
  );
}

import React from "react"
import MetroHero from "@/components/ui/scroll-locked-video-hero"

export default function DemoOne() {
  return <MetroHero />
}

export function KaushalNexusHeroDemo({ onExplore }: { onExplore?: () => void }) {
  return (
    <MetroHero
      title="KAUSHAL NEXUS"
      tagline="Connecting Verified Skills with National Career Opportunities."
      scrollHint="SCROLL TO EXPLORE"
      signature={{ name: "KaushalNexus", url: "/" }}
      actionLabel="Enter Platform"
      onActionClick={onExplore}
      unlockOnEnd={true}
    />
  )
}

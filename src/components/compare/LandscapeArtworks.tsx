import React from 'react';
import goldLandscape from '../../assets/compare/landscape-gold.webp';
import emeraldLandscape from '../../assets/compare/landscape-emerald.webp';
import azureLandscape from '../../assets/compare/landscape-azure.webp';
import lavenderLandscape from '../../assets/compare/landscape-lavender.webp';
import terracottaLandscape from '../../assets/compare/landscape-terracotta.webp';

export type LandscapeVariant = 'gold' | 'emerald' | 'azure' | 'lavender' | 'terracotta';

interface LandscapeArtworkProps {
  variant: LandscapeVariant;
}

const LANDSCAPES: Record<LandscapeVariant, string> = {
  gold: goldLandscape,
  emerald: emeraldLandscape,
  azure: azureLandscape,
  lavender: lavenderLandscape,
  terracotta: terracottaLandscape,
};

export const LandscapeArtwork: React.FC<LandscapeArtworkProps> = React.memo(({ variant }) => (
  <img
    src={LANDSCAPES[variant]}
    className="landscape-artwork"
    alt=""
    aria-hidden="true"
    draggable={false}
  />
));

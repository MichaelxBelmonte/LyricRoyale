// Curated quick-pick artists for the Soundcheck. Lyric-rich, broadly known, and
// overlapping with the richsync-verified demo setlist, so tapping a card reliably
// yields playable rounds. Players can still add their own.

export interface CuratedArtist {
  name: string;
}

export const CURATED_ARTISTS: CuratedArtist[] = [
  { name: "Queen" },
  { name: "The Beatles" },
  { name: "Taylor Swift" },
  { name: "Eminem" },
  { name: "Adele" },
  { name: "Coldplay" },
  { name: "Beyoncé" },
  { name: "Ed Sheeran" },
  { name: "Billie Eilish" },
  { name: "The Weeknd" },
  { name: "Rihanna" },
  { name: "Dua Lipa" },
];

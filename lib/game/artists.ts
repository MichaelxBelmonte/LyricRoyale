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

// Curated top-level genres for the "by genre" music source. IDs are Musixmatch
// `music_genre_id` values (verified against music.genres.get); tapping one pulls
// that genre's top rating-sorted tracks via /api/mxm/tracks?genreId=.
export interface CuratedGenre {
  id: number;
  name: string;
}

export const CURATED_GENRES: CuratedGenre[] = [
  { id: 14, name: "Pop" },
  { id: 18, name: "Hip-Hop/Rap" },
  { id: 21, name: "Rock" },
  { id: 15, name: "R&B/Soul" },
  { id: 17, name: "Dance" },
  { id: 7, name: "Electronic" },
  { id: 6, name: "Country" },
  { id: 12, name: "Latin" },
  { id: 20, name: "Alternative" },
  { id: 51, name: "K-Pop" },
];

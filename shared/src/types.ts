import MusicPlayer from "@backend/lib/MusicPlayer/MusicPlayer";

export type SongMetadata = {
  yt_id: string;
  yt_title: string;
  yt_author: string;
  spotify_title: string | null;
  spotify_author: string | null;
  length_seconds: number | null;
  lufs: number | null;
};

export type PlaylistEntry = {
  id: string;
  userId: string | null;
};

export type PlayerState = {
  playing: boolean;
  currentlyPlaying: PlaylistEntry | null;
  currentSongStartedAtTs: number;
  playlist: PlaylistEntry[];
  thumbnail: string;
  seek: number;
  currentSongMetadata: SongMetadata | null;
};

export type IMusicPlayer = typeof MusicPlayer;

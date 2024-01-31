import MusicPlayer from "@backend/lib/MusicPlayer/MusicPlayer";
import { Song } from "@backend/schema";

export type SongDisplayMetadata = Omit<Song, "loudnessLufs" | "fileName">;

export type SongPlaybackMetadata = {
  yt_id: string;
  lufs: number | null;
};

export type SongMetadata = SongDisplayMetadata & SongPlaybackMetadata;

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
  currentSongMetadata: SongDisplayMetadata | null;
};

export type IMusicPlayer = typeof MusicPlayer;

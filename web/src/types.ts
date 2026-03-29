export interface Playlist {
  playlist_id: string;
  title: string;
  thumbnail?: string;
  count?: string;
  author?: string | null;
}

export interface Track {
  video_id: string;
  title: string;
  artist: string;
  album?: string;
  duration?: string;
  thumbnail?: string;
  set_video_id?: string;
}

export interface RankingItem {
  entity_type: string;
  entity_id?: string;
  entity_name: string;
  score: number;
  play_count: number;
  liked: boolean;
}

export interface Job {
  id: string;
  name: string;
  action: string;
  target_playlist_id?: string;
  cron: string;
  next_run?: string;
  created_at?: string;
}

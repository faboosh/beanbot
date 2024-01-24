import { component, styled } from "@faboosh/direct-wire-js";
import playerState from "../../state/playerState";
import PlayerAPI from "../../api/player";

type SongMetadata = {
  yt_id: string;
  yt_title: string;
  yt_author: string;
  spotify_title: string;
  spotify_author: string;
  length_seconds: number;
  lufs: number;
};

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  max-height: 100%;
  overflow-y: auto;
`({ class: "d-flex flex-column gap shadow-lg p-2 pt-1" });

const PlaylistItem = styled.div`
  border-bottom: 1px solid var(--gray-600);
`({ class: "d-flex flex-column gap-1 py-1" });

const Title = styled.p`
  font-size: 1rem;
  line-height: 1rem;
`({ class: "m-0 p-0" });

const Author = styled.p`
  font-size: 0.7rem;
  line-height: 0.7rem;
`({ class: "m-0 p-0" });

const PlayerQueue = component(() => {
  let playlist: string[] = playerState.state.playlist;
  const off = playerState.onChange((data) => {
    playlist = data.playlist;
    renderPlaylist();
  });

  const renderPlaylist = async () => {
    const data: SongMetadata[] = await Promise.all(
      playlist.map((id) => {
        return PlayerAPI.videoDetails(id);
      })
    );
    console.log("song meta", data);

    wrapper.innerHTML = "";
    data.forEach((entry) => {
      wrapper.appendChild(
        PlaylistItem([
          Title(entry.spotify_title ? entry.spotify_title : entry.yt_title),
          Author(entry.spotify_author ? entry.spotify_author : entry.yt_author),
        ])
      );
    });
  };
  const wrapper = Wrapper();
  return {
    root: wrapper,
    cleanup() {
      off();
    },
  };
});

export default PlayerQueue;

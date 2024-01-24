import { component, styled } from "@faboosh/direct-wire-js";
import PlayerAPI from "../../api/player";
import Icon from "../Icon";
import playerState from "../../state/playerState";

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  min-height: 0;
  max-height: 100%;
`({ class: "d-flex flex-column gap-3 py-3" });

const Results = styled.div`
  flex-grow: 1;
  overflow-y: scroll;
  height: 100%;
  min-height: 0;
  max-height: 100%;
`({ class: "d-flex flex-column gap-2 px-2" });

const ResultWrapper = styled.div`
  border-bottom: 1px solid var(--gray-600);
`({
  class: "d-flex justify-between align-center pb-2 gap-1",
});

const QueueButton = styled.button`
  height: 30px;
`;

const ResultText = styled.div``({ class: "d-flex flex-column gap-1" });

const ResultTitle = styled.p`
  line-height: 1rem;
`({ class: "m-0 p-0" });

const ResultAuthor = styled.p`
  font-size: 0.8rem;
  line-height: 0.8rem;
`({ class: "m-0 p-0" });

const ResultTimestamp = styled.span`
  font-size: 0.7rem;
  line-height: 0.7rem;
`({ class: "m-0 p-0 ms-2" });

const SearchInput = styled.input`
  line-height: 1rem;
  font-size: 1rem;
  background: var(--gray-900);
  color: var(--gray-50);
  padding: var(--space-2) var(--space-3);
  margin: 0 var(--space-2);
  border: none;
  border-radius: 0.5rem;
`;

const PlayerSearch = component<{}, {}>(() => {
  const results = Results();
  let videos: any[] = [];
  let playlist: string[] = [];
  let timeout: any;
  const handleOnInput = (e: any) => {
    clearTimeout(timeout);
    const query = e.target.value;

    if (query.length < 3) return;

    timeout = setTimeout(() => {
      updateResults(query);
    }, 500);
  };

  const updateResults = (query: string) => {
    PlayerAPI.search(query)
      .then((res: any[]) => {
        videos = res;
        renderResults();
      })
      .catch(console.error);
  };

  const off = playerState.onChange((data) => {
    playlist = data.playlist;
    renderResults();
  });

  const renderResults = () => {
    results.innerHTML = "";
    videos.forEach((video) => {
      const inPlaylist = playlist.includes(video.id);
      results.appendChild(
        ResultWrapper([
          ResultText([
            ResultTitle(video.title.text),
            ResultAuthor([
              video.author.name,
              ResultTimestamp(video.duration.text),
            ]),
          ]),
          QueueButton({
            class: inPlaylist ? "bg-accent" : "",
            onclick: () => PlayerAPI.queue(video.id),
          })(
            Icon({
              icon: inPlaylist ? "fa-solid fa-check" : "fa-solid fa-list",
            })
          ),
        ])
      );
    });
  };

  const searchInput = SearchInput({
    oninput: handleOnInput,
    placeholder: "Search",
  })();

  return {
    root: Wrapper([searchInput, results]),
    cleanup() {
      clearTimeout(timeout);
      off();
    },
  };
});

export default PlayerSearch;

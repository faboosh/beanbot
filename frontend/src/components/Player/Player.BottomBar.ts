import { component, styled } from "@faboosh/direct-wire-js";
import PlayerControls from "./Player.Controls";
import playerState from "../../state/playerState";

type PlayerState = {
  playing: boolean;
  currentlyPlaying: string | null;
  currentSongStartedAtTs: number;
  playlist: string[];
  thumbnail: string;
  currentSongMetadata: {
    yt_id: string;
    yt_title: string;
    yt_author: string;
    spotify_title: string;
    spotify_author: string;
    length_seconds: number;
    lufs: number;
  } | null;
};

function autoScrollText(node: HTMLElement, text: string) {
  // Set the text to the DOM node
  node.innerText = text;
  node.style.whiteSpace = "nowrap"; // Ensure text stays in one line
  node.style.overflow = "hidden"; // Hide the overflow

  // Function to check if the content overflows
  function isOverflowing(element: HTMLElement) {
    return element.scrollWidth > element.clientWidth;
  }

  // Function to animate the scroll
  function animateScroll() {
    let totalWidth = node.scrollWidth;
    let currentScroll = 0;
    const scrollStep = 0.5; // Pixels to move per frame
    const resetPosition = -totalWidth; // Reset position after scrolling

    function step() {
      if (currentScroll < resetPosition) {
        currentScroll = node.clientWidth; // Reset scroll to start position
      } else {
        currentScroll -= scrollStep; // Move text left
      }
      node.scrollLeft = -currentScroll;

      window.requestAnimationFrame(step);
    }

    return window.requestAnimationFrame(step);
  }

  // Start animation if the content overflows
  if (isOverflowing(node)) {
    animateScroll();
  }
}

const Wrapper = styled.div`
  margin: 0 auto;
  width: 100%;
  background: var(--gray-700);
  display: flex;
  align-items: stretch;
  /* border-radius: 0.5rem; */
`({
  class: "d-flex gap-2 p-2",
});

const TextContent = styled.div`
  background: var(--gray-700);
  min-width: 0;
  width: 100%;
`({
  class: "d-flex flex-column gap-2 pt-1",
});

const PlayBar = styled.div`
  --progress-percent: 0;
  width: 100%;
  position: relative;
  background: var(--gray-600);
  height: 0.2rem;
  border-radius: 9999px;
  overflow: hidden;
`;
const PlayBarIndicator = styled.div`
  background: var(--accent-200);
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: var(--progress-percent);
`;

const TimestampWrapper = styled.div`
  display: flex;
  justify-content: end;
`;

const Heading = styled.h1`
  font-size: 1rem;
  line-height: 1rem;
`;

const Artist = styled.p`
  font-size: 0.8rem;
  line-height: 0.8rem;
`;

const Timestamp = styled.p`
  font-size: 0.8rem;
  line-height: 0.8rem;
`;

const Thumbnail = styled.img`
  max-height: 100%;
  width: auto;
  flex-shrink: 1;
  border-radius: 0.5rem;
  margin: 0;
  height: 5rem;
`;

const secondsToTimestamp = (seconds: number) => {
  seconds = Math.round(seconds);
  let minutes = Math.floor(seconds / 60);
  let remainingSeconds = seconds % 60;

  // Adding leading zero if minutes or seconds are less than 10
  let formattedMinutes = minutes < 10 ? "0" + minutes : minutes;
  let formattedSeconds =
    remainingSeconds < 10 ? "0" + remainingSeconds : remainingSeconds;

  return formattedMinutes + ":" + formattedSeconds;
};

const PlayerBottomBar = component(() => {
  const title = Heading({ class: "m-0 p-0" })();
  const artist = Artist({ class: "m-0 p-0 mt-n1" })();
  const timestamp = Timestamp({ class: "m-0 p-0" })();
  const playBar = PlayBar()(PlayBarIndicator()());
  const thumbnail = Thumbnail({ class: "mb-2" })() as HTMLImageElement;

  let timeout: any;
  let animationFrame: any;
  playerState.onChange((data: PlayerState) => {
    clearInterval(timeout);
    cancelAnimationFrame(animationFrame);
    thumbnail.src = data.thumbnail;
    if (data.currentSongMetadata) {
      const { yt_author, yt_title, spotify_title, spotify_author } =
        data.currentSongMetadata;
      const titleText = spotify_title ? spotify_title : yt_title;
      const artistText = spotify_author ? spotify_author : yt_author;

      title.innerText = titleText;
      artist.innerText = artistText;
      autoScrollText(title, titleText);
    }

    timeout = setInterval(() => {
      if (!data.currentSongMetadata?.length_seconds) return;
      const totalLength = Math.min(data.currentSongMetadata.length_seconds);
      const elapsedSeconds = Math.min(
        Math.round(Date.now() - data.currentSongStartedAtTs) / 1000,
        totalLength
      );
      const progress = Math.min(elapsedSeconds / totalLength, 1);
      timestamp.innerText = `${secondsToTimestamp(
        elapsedSeconds
      )}/${secondsToTimestamp(totalLength)}`;
      playBar.style.setProperty("--progress-percent", `${progress * 100}%`);
    }, 100);
  });

  return {
    root: Wrapper([
      thumbnail,
      TextContent([title, artist, playBar, TimestampWrapper()(timestamp)]),
      PlayerControls(),
    ]),
    cleanup() {},
  };
});

export default PlayerBottomBar;

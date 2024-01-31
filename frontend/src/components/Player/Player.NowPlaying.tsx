import { CSSProperties, useEffect, useRef, useState } from "react";
import { usePlayerContext } from "../../context/PlayerContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlayCircle,
  faPauseCircle,
  faForwardStep,
  faShuffle,
} from "@fortawesome/free-solid-svg-icons";
import styled from "styled-components";
import PlayerAPI from "../../api/player";
import PlayerUserIcon from "./Player.UserIcon";

const NowPlayingWrapper = styled.div`
  position: relative;
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: var(--thumbnail);
    background-size: cover;
    background-position: center;
    filter: blur(100px) brightness(0.8);
    overflow: hidden;
    z-index: 1;
  }
`;

const Thumbnail = styled.img`
  height: 80px;
  width: auto;
  border-radius: 0.5rem;
`;

const TitleArtistWrapper = styled.div`
  flex-grow: 1;
`;

const Title = styled.p`
  font-size: 0.8rem;
  line-height: 0.8rem;
  font-weight: 600;
`;

const Artist = styled.p`
  font-size: 0.7rem;
  line-height: 0.7rem;
`;

const ControlsWrapper = styled.div`
  flex-grow: 1;
  min-width: 0;
  position: relative;
  max-width: 600px;
`;

const Timestamp = styled.p`
  margin: 0;
  padding: 0;
  font-size: 0.6rem;
  line-height: 0.6rem;
  font-weight: 800;
`;

const Button = styled.div`
  background: transparent;
  padding: 0;
  margin: 0;
  cursor: pointer;
`;

const Timeline = styled.div`
  position: relative;
  width: 100%;
  height: 5px;
  border-radius: 5px;
  background: rgba(0, 0, 0, 0.3);

  &:after {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: var(--progress-percent);
    background: var(--gray-50);
  }
`;

const Content = styled.div`
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  overflow: hidden;
`;

const secondsToTimestamp = (seconds: number) => {
  seconds = Math.round(seconds);
  let minutes = Math.floor(seconds / 60);
  let remainingSeconds = seconds % 60;

  let formattedMinutes = minutes;
  let formattedSeconds =
    remainingSeconds < 10 ? "0" + remainingSeconds : remainingSeconds;

  return formattedMinutes + ":" + formattedSeconds;
};

const PlayerNowPlaying = ({ style }: { style: CSSProperties }) => {
  const {
    currentSongMetadata,
    thumbnail,
    currentlyPlaying,
    currentSongStartedAtTs,
    playing,
  } = usePlayerContext();

  const [elapsed, setElapsed] = useState("0:00");
  const [totalLength, setTotalLength] = useState("0:00");
  const [usersWhoPlayed, setUsersWhoPlayed] = useState<any[]>([]);
  const wrapperRef = useRef<any>();

  const getTitle = () => {
    if (!currentSongMetadata) return "";
    const { youtubeTitle, spotifyTitle } = currentSongMetadata;

    return spotifyTitle ? spotifyTitle : youtubeTitle;
  };

  const getArtist = () => {
    if (!currentSongMetadata) return "";
    const { youtubeAuthor, spotifyTitle } = currentSongMetadata;

    return spotifyTitle ? spotifyTitle : youtubeAuthor;
  };

  useEffect(() => {
    if (
      !wrapperRef.current ||
      !currentSongMetadata ||
      !currentSongMetadata.lengthSeconds
    )
      return;
    const wrapper = wrapperRef.current;
    const totalLength = Math.min(currentSongMetadata.lengthSeconds);
    const interval = setInterval(() => {
      const elapsedSeconds = Math.min(
        Math.round(Date.now() - currentSongStartedAtTs) / 1000,
        totalLength
      );
      const progress = Math.min(elapsedSeconds / totalLength, 1);

      setTotalLength(secondsToTimestamp(totalLength));
      setElapsed(secondsToTimestamp(elapsedSeconds));
      wrapper.style.setProperty("--progress-percent", `${progress * 100}%`);
    });

    return () => {
      clearInterval(interval);
    };
  }, [currentlyPlaying, currentSongMetadata, wrapperRef]);

  useEffect(() => {
    if (!wrapperRef.current) return;
    wrapperRef.current.style.setProperty("--thumbnail", `url("${thumbnail}")`);
  }, [thumbnail]);

  useEffect(() => {
    if (!currentlyPlaying) return;

    const timeout = setTimeout(() => {
      PlayerAPI.getUsersWhoPlayed(currentlyPlaying.id)
        .then(setUsersWhoPlayed)
        .catch(console.error);
    }, 200);

    return () => {
      clearTimeout(timeout);
    };
  }, [currentlyPlaying]);

  useEffect(() => {
    console.log(usersWhoPlayed);
  }, [usersWhoPlayed]);

  return (
    <NowPlayingWrapper className="shadow-lg" ref={wrapperRef} style={style}>
      <Content className="gap-2 p-2">
        <div className="d-flex gap-2">
          <Thumbnail src={thumbnail} />
          <TitleArtistWrapper className="d-flex flex-column gap-1 pt-1">
            <Title className="m-0 p-0">{getTitle()}</Title>
            <Artist className="m-0 p-0">{getArtist()}</Artist>
          </TitleArtistWrapper>
        </div>
        <div className="d-flex align-center justify-center w-100">
          <ControlsWrapper className="d-flex flex-column align-center justify-center gap-2">
            <div className="d-flex align-center justify-center gap-2">
              <Button onClick={() => PlayerAPI.skip()}>
                <FontAwesomeIcon icon={faShuffle} size="sm" />
              </Button>
              <Button
                onClick={() =>
                  playing ? PlayerAPI.pause() : PlayerAPI.unpause()
                }
              >
                <FontAwesomeIcon
                  icon={playing ? faPauseCircle : faPlayCircle}
                  size="2xl"
                />
              </Button>
              <Button onClick={() => PlayerAPI.skip()}>
                <FontAwesomeIcon icon={faForwardStep} size="sm" />
              </Button>
            </div>
            <div className="d-flex gap-2 align-center w-100">
              <Timestamp>{elapsed}</Timestamp>

              <Timeline />
              <Timestamp>{totalLength}</Timestamp>
            </div>
          </ControlsWrapper>
        </div>
        <div className="d-flex align-center justify-end gap-2 pe-3 w-100">
          {usersWhoPlayed
            .filter((user) => !user.bot)
            .map((user) => {
              return <PlayerUserIcon user={user} />;
            })}
        </div>
      </Content>
    </NowPlayingWrapper>
  );
};

export default PlayerNowPlaying;

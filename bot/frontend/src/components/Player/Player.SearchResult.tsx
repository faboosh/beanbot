import { faCheck, faList } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import PlayerAPI from "../../api/player";
import { usePlayerContext } from "../../context/PlayerContext";
import Loader from "../Loader";

export type TPlayerSearchResult = {
  id: string;
  title: string;
  author: string;
  thumbnail: string;
  length: string;
};

const TitleArtistWrapper = styled.div`
  flex-grow: 1;
  width: fit-content;
  max-width: 700px;
  min-width: 100px;
`;

const Title = styled.p`
  font-size: 0.8rem;
  line-height: 0.8rem;
  font-weight: 600;
  margin: 0;
  padding: 0;
`;

const Artist = styled.p`
  font-size: 0.7rem;
  line-height: 0.7rem;
  margin: 0;
  padding: 0;
`;

const Thumbnail = styled.img`
  width: auto;
  height: 60px;
`;

const ThumbnailContent = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.5);
  transition: 0.2s opacity;
  opacity: 0;
`;

const ThumbnailWrapper = styled.div`
  position: relative;
  width: auto;
  height: 60px;
  transition: 0.2s filter;
  overflow: hidden;
  cursor: pointer;

  & ${Thumbnail} {
    filter: blur(0px);
  }

  &:hover ${ThumbnailContent}, &.overlay ${ThumbnailContent} {
    opacity: 1;
  }

  &:hover ${Thumbnail}, &.overlay ${Thumbnail} {
    filter: blur(2px);
  }
`;

const QueueButton = styled.div`
  padding: 0;
  margin: 0;
  cursor: pointer;
  background: transparent;
  color: var(--gray-50);
`;

const PlayerSearchResult = ({ result }: { result: TPlayerSearchResult }) => {
  const { playlist } = usePlayerContext();
  const [loading, setLoading] = useState(false);

  const inQueue = playlist.map((result) => result.id).includes(result.id);

  const handleQueue = async () => {
    if (inQueue || loading) return;
    setLoading(true);
    await PlayerAPI.queue(result.id);
    setLoading(false);
  };

  return (
    <div className="d-flex gap-2">
      <ThumbnailWrapper className={inQueue || loading ? "overlay" : ""}>
        <Thumbnail src={result.thumbnail} />
        <ThumbnailContent
          className="d-flex align-center justify-center"
          onClick={() => handleQueue()}
        >
          <QueueButton>
            {loading && !inQueue ? (
              <Loader size="1rem" />
            ) : (
              <FontAwesomeIcon icon={inQueue ? faCheck : faList} />
            )}
          </QueueButton>
        </ThumbnailContent>
      </ThumbnailWrapper>
      <TitleArtistWrapper>
        <Title>{result.title}</Title>
        <Artist>{result.author}</Artist>
      </TitleArtistWrapper>
    </div>
  );
};

export default PlayerSearchResult;

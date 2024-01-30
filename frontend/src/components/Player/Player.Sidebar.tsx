import React, { useEffect, useState } from "react";
import { usePlayerContext } from "../../context/PlayerContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import PlayerAPI from "../../api/player";
import styled from "styled-components";
import type { SongMetadata } from "@shared/types";
import PlayerQueueItem from "./Player.QueueItem";

const SidebarWrapper = styled.div<{ expanded: boolean }>`
  position: absolute;
  width: 25vw;
  height: 100%;
  right: ${(props) => (props.expanded ? "0px" : "-25vw")};
  top: 0;
  background: var(--gray-900);
  z-index: 10;
  transition: 0.5s right;
`;

const ExpandButton = styled.button`
  position: absolute;
  top: 50%;
  left: 0;
  transform: translate(-100%, -50%);

  &:active,
  &:focus {
    outline: none;
  }
`;

const EmptyState = styled.div`
  color: var(--gray-700);
  text-align: center;

  h1 {
    font-size: 1.5rem;
  }
`;

const PlayerSidebar = () => {
  const { playlist } = usePlayerContext();
  const [results, setResults] = useState<SongMetadata[]>([]);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    console.log(playlist);
    const timeout = setTimeout(async () => {
      const results = await Promise.all(
        playlist.map(async (entry) => {
          return {
            ...(await PlayerAPI.videoDetails(entry.id)),
            yt_id: entry.id,
          };
        })
      );
      setResults(results as SongMetadata[]);
    }, 500);
    return () => {
      clearTimeout(timeout);
    };
  }, [playlist]);

  return (
    <SidebarWrapper
      expanded={expanded}
      className="d-flex flex-column gap-2 p-2 shadow-lg"
    >
      <ExpandButton onClick={() => setExpanded(!expanded)}>
        <FontAwesomeIcon icon={expanded ? faArrowRight : faArrowLeft} />
      </ExpandButton>
      {results.map((result, i) => {
        return <PlayerQueueItem item={result} place={i} key={i} />;
      })}
      {results.length === 0 && (
        <EmptyState className="d-flex align-center justify-center w-100 h-100">
          <h1>Queue is empty</h1>
        </EmptyState>
      )}
    </SidebarWrapper>
  );
};

export default PlayerSidebar;

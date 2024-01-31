import { faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { SongMetadata } from "@shared/types";
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import PlayerAPI from "../../api/player";
import { usePlayerContext } from "../../context/PlayerContext";
import PlayerUserIcon from "./Player.UserIcon";

const TitleArtistWrapper = styled.div`
  flex-grow: 1;
  width: fit-content;
`;

const Title = styled.p`
  font-size: 0.8rem;
  line-height: 0.8rem;
  font-weight: 600;
  margin: 0;
  padding: 0;
`;

// const Order = styled.p`
//   padding: 0;
//   padding-top: 0.1rem;
//   font-size: 0.6rem;
//   line-height: 0.6rem;
//   font-weight: 900;
//   margin: 0;
// `;

const Artist = styled.p`
  font-size: 0.7rem;
  line-height: 0.7rem;
  margin: 0;
  padding: 0;
`;

const DeleteButton = styled.button`
  background: transparent;
  color: var(--danger-400);
  transition: 0.2s opacity;
  opacity: 0;
  visibility: hidden;
`;

const PlaylistItem = styled.div`
  border-bottom: 1px solid var(--gray-700);
  &:hover ${DeleteButton} {
    opacity: 1;
    visibility: visible;
  }
`;

const PlayerQueueItem = ({ item }: { item: SongMetadata; place?: number }) => {
  const [userData, setUserData] = useState<any | null>(null);
  const { playlist } = usePlayerContext();

  const getTitle = (result: SongMetadata) => {
    const { yt_title, spotify_title } = result;
    return spotify_title ? spotify_title : yt_title;
  };

  const getArtist = (result: SongMetadata) => {
    const { yt_author, spotify_author } = result;
    return spotify_author ? spotify_author : yt_author;
  };

  useEffect(() => {
    const entry = playlist.filter((entry) => entry.id === item.yt_id)?.[0];
    if (!entry || !entry.userId) return;
    PlayerAPI.getUserDetails(entry.userId)
      .then(setUserData)
      .catch(console.error);
  }, [item, playlist]);

  return (
    <PlaylistItem className="d-flex flex-colum justify-between gap-2 pb-2">
      <div className="d-flex gap-2">
        {/* <Order>{place + 1}.</Order> */}
        <div className="d-flex align-center justify-center">
          {userData && <PlayerUserIcon user={userData} />}
        </div>
        <TitleArtistWrapper>
          <Title>{getTitle(item)}</Title>
          <Artist>{getArtist(item)}</Artist>
        </TitleArtistWrapper>
      </div>
      <DeleteButton onClick={() => PlayerAPI.removeFromQueue(item.yt_id)}>
        <FontAwesomeIcon icon={faTrash} />
      </DeleteButton>
    </PlaylistItem>
  );
};

export default PlayerQueueItem;

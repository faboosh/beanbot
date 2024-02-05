import React from "react";
import styled from "styled-components";

const UserIcon = styled.img`
  width: 2rem;
  height: 2rem;
  border-radius: 9999px;
`;

const Tooltip = styled.div`
  position: absolute;
  left: 50%;
  bottom: 0;
  transform: translate(-50%, calc(100% - var(--space-2)));
  background: var(--gray-900);
  font-weight: 500;
  font-size: 0.8rem;
  border-radius: 0.5rem;
  padding: var(--space-0) var(--space-2);
  opacity: 0;
  transition: 0.2s opacity;
`;

const Wrapper = styled.div`
  position: relative;

  &:hover ${Tooltip} {
    opacity: 1;
  }
`;

const PlayerUserIcon = ({ user }: { user: any }) => {
  return (
    <Wrapper>
      <UserIcon src={user.displayAvatarURL} alt={user.username} />
      <Tooltip>{user.username}</Tooltip>
    </Wrapper>
  );
};

export default PlayerUserIcon;

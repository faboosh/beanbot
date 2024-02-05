import React from "react";
import styled, { keyframes } from "styled-components";

const breathe = keyframes`
  from {
    transform: scaleY(10%);
  }

  to {
    transform: scaleY(100%);
  }
`;

const Wrapper = styled.div<{ size: string }>`
  width: ${({ size }) => size};
  height: ${({ size }) => size};
  gap: 15%;
`;

const Bar = styled.div<{ animationDelay: string; size: string }>`
  animation-name: ${breathe};
  animation-duration: 0.5s;
  animation-fill-mode: forwards;
  animation-direction: alternate;
  animation-iteration-count: infinite;
  animation-timing-function: linear;
  animation-delay: ${({ animationDelay }) => animationDelay};
  width: 100%;
  height: ${({ size }) => size};
  background: var(--gray-50);
`;

const Loader = ({ size }: { size: string }) => {
  return (
    <Wrapper size={size} className="d-flex">
      <Bar size={size} animationDelay="0s" />
      <Bar size={size} animationDelay="-0.3s" />
      <Bar size={size} animationDelay="-0.6s" />
    </Wrapper>
  );
};

export default Loader;

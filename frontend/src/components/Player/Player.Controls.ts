import { component, styled } from "@faboosh/direct-wire-js";
import PlayerAPI from "../../api/player";
import Icon from "../Icon";
import playerState from "../../state/playerState";

const Wrapper = styled.div``({
  class: "d-flex gap-2 justify-center align-center",
});
const Button = styled.button`
  height: fit-content;
  border-radius: 0.5rem;
`;

const PlayerControls = component(() => {
  const off = playerState.onChange((data) => {
    if (data.playing) {
      PlayBtn.classList.add("d-none");
      PauseBtn.classList.remove("d-none");
    } else {
      PlayBtn.classList.remove("d-none");
      PauseBtn.classList.add("d-none");
    }
  });

  const SkipBtn = Button({
    onclick: () => PlayerAPI.skip(),
  })(Icon({ icon: "fa-solid fa-forward" }));
  const PauseBtn = Button({
    onclick: () => PlayerAPI.pause(),
  })(Icon({ icon: "fa-solid fa-pause" }));
  const PlayBtn = Button({
    onclick: () => PlayerAPI.unpause(),
  })(Icon({ icon: "fa-solid fa-play" }));

  return {
    root: Wrapper([PauseBtn, PlayBtn, SkipBtn]),
    cleanup() {
      off();
    },
  };
});

export default PlayerControls;

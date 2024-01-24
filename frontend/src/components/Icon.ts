import { component, i } from "@faboosh/direct-wire-js";

const Icon = component<{ icon: string }, {}>(({ icon }) => {
  return {
    root: i({ class: icon })(),
    cleanup() {},
  };
});

export default Icon;

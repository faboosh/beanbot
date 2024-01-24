import "./styles/base.css";
import "./styles/colorsystem.css";
import "./styles/flex.css";
import "./styles/spacing.css";
import "./styles/main.css";
import { mount } from "@faboosh/direct-wire-js/dist/html";
import Player from "./components/Player/Player";
import { setToken } from "./token";

document.addEventListener("DOMContentLoaded", () => {
  const currentUrl = window.location.href;
  const urlParams = new URLSearchParams(new URL(currentUrl).search);
  const token = urlParams.get("jwt");
  setToken(token as string);
  mount("#app", Player());
});

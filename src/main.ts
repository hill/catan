import { init } from "./canvas";
import "./style.css";

// biome-ignore lint/style/noNonNullAssertion: <explanation>
document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <canvas id="gameCanvas" style="width:100%;height:100%;"></canvas>
  </div>
`;

init();

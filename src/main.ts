import { init } from "./canvas";
import "./style.css";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <canvas id="gameCanvas" style="width:100%;height:100%;"></canvas>
  </div>
`;

init();

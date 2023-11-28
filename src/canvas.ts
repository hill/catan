const resources = ["wood", "brick", "sheep", "wheat", "ore", "desert"] as const;
type Resource = (typeof resources)[number];

const HEX_SIZE = 70;

function cube_round({ q, r, s }: { q: number; r: number; s: number }) {
  // https://www.redblobgames.com/grids/hexagons/#rounding
  let q_rounded = Math.round(q);
  let r_rounded = Math.round(r);
  let s_rounded = Math.round(s);

  const q_diff = Math.abs(q_rounded - q);
  const r_diff = Math.abs(r_rounded - r);
  const s_diff = Math.abs(s_rounded - s);

  if (q_diff > r_diff && q_diff > s_diff) {
    q_rounded = -r_rounded - s_rounded;
  } else if (r_diff > s_diff) {
    r_rounded = -q_rounded - s_rounded;
  } else {
    s_rounded = -q_rounded - r_rounded;
  }

  return { q: q_rounded, r: r_rounded, s: s_rounded };
}

function get_hex_coords(x: number, y: number, size: number) {
  const q = ((Math.sqrt(3) / 3) * x + (-1 / 3) * y) / size;
  const r = ((2 / 3) * y) / size;
  const { q: q_rounded, r: r_rounded } = cube_round({ q, r, s: -q - r });
  return { q: q_rounded, r: r_rounded };
}

class PointyHexTile {
  private cubeCoords: { q: number; r: number; s: number };
  private size: number;

  constructor(q: number, r: number, s: number, size = HEX_SIZE) {
    this.cubeCoords = { q, r, s };
    this.size = size;
  }

  public getCoords() {
    return [this.cubeCoords.q, this.cubeCoords.r, this.cubeCoords.s];
  }

  public get2DCoords() {
    // https://www.redblobgames.com/grids/hexagons/#hex-to-pixel-axial
    const { q, r } = this.cubeCoords;
    const x = this.size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
    const y = this.size * ((3 / 2) * r);
    return [x, y];
  }
}

class ResourceTile extends PointyHexTile {
  public resource: Resource;
  public number: number;

  constructor(q: number, r: number, s: number) {
    super(q, r, s);
    this.resource = this.getRandomResource();
    this.number = this.getRandomNumber();
  }

  private getRandomResource() {
    const randomResource = Math.floor(Math.random() * resources.length);
    return resources[randomResource];
  }

  private getRandomNumber() {
    return Math.floor(Math.random() * 11) + 2;
  }
}

class AssetManager {
  private assets: Map<string, HTMLImageElement>;

  constructor() {
    this.assets = new Map();
  }

  public loadAsset(name: string, url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.assets.set(name, img);
        resolve();
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  public getAsset(name: string) {
    return this.assets.get(name);
  }

  public loadManyAssets(assets: [string, string][]): Promise<void[]> {
    return Promise.all(assets.map(([name, url]) => this.loadAsset(name, url)));
  }
}

class BoardGame {
  private assetManager: AssetManager;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private tiles: ResourceTile[];
  private mousePosition: { x: number; y: number } | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.assetManager = new AssetManager();
    this.loadAssets();
    this.canvas = canvas;
    this.ctx = setupCanvas(canvas);
    const dpr = window.devicePixelRatio || 1;
    this.width = canvas.width / dpr;
    this.height = canvas.height / dpr;
    this.tiles = this.createGrid();

    this.initializeGame();
  }

  private async initializeGame() {
    await this.loadAssets();

    this.canvas.addEventListener("mousemove", (event) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mousePosition = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      this.drawBoard();
    });

    this.canvas.addEventListener("mouseleave", () => {
      this.mousePosition = null;
      this.drawBoard();
    });

    this.drawBoard();
  }

  private createGrid() {
    const tiles: ResourceTile[] = [];
    const radius = 2;
    // stare hard at the diagram here: https://www.redblobgames.com/grids/hexagons/#coordinates-cube
    for (let r = -radius; r <= radius; r++) {
      for (let q = -radius; q <= radius; q++) {
        const s = -q - r;
        if (Math.abs(s) <= radius) {
          tiles.push(new ResourceTile(q, r, s));
        }
      }
    }
    return tiles;
  }

  private findTileAt(x: number, y: number): ResourceTile | undefined {
    for (const tile of this.tiles) {
      const [tileX, tileY] = tile.get2DCoords();
      const distance = Math.sqrt((x - tileX) ** 2 + (y - tileY) ** 2);
      if (distance < HEX_SIZE) {
        return tile;
      }
    }
    return undefined;
  }

  private drawBoard() {
    this.drawBackground();

    const mouseOverTile =
      this.mousePosition &&
      this.findTileAt(
        this.mousePosition.x - this.width / 2,
        this.mousePosition.y - this.height / 2
      );
    this.tiles.forEach((tile) => {
      const [x, y] = tile.get2DCoords();
      // const asset = this.assetManager.getAsset(`${tile.resource}tile`);
      const highlight = mouseOverTile === tile;
      const colorMap = {
        wood: "#378805",
        brick: "#8B4513",
        sheep: "#00FF00",
        wheat: "#FFD700",
        ore: "#808080",
        desert: "#F5DEB3",
      };

      drawHexagon(this.ctx, this.width / 2 + x, this.height / 2 + y, HEX_SIZE, {
        fill: colorMap[tile.resource] + (highlight ? "CC" : "FF"),
      });
      // draw some text in the middle of the hexagon with coordinates
      this.ctx.fillStyle = "black";
      this.ctx.font = "12px sans-serif";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText(
        `${tile.number}: ${tile.getCoords()}`,
        this.width / 2 + x,
        this.height / 2 + y
      );
    });
  }

  private drawBackground() {
    this.ctx.fillStyle = "lightblue";
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private loadAssets() {
    return this.assetManager.loadManyAssets([
      ["woodtile", "/assets/tile/wood.png"],
      ["bricktile", "/assets/tile/brick.png"],
      ["sheeptile", "/assets/tile/sheep.png"],
      ["wheattile", "/assets/tile/wheat.png"],
      ["oretile", "/assets/tile/ore.png"],
      ["deserttile", "/assets/tile/desert.png"],
    ]);
  }
}

function drawHexagon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  {
    stroke = "black",
    fill = "white",
    asset,
  }: {
    stroke?: string;
    fill?: string;
    asset?: HTMLImageElement;
  }
) {
  ctx.beginPath();
  for (let side = 0; side < 7; side++) {
    // Start at an angle of 30 degrees (π/6 radians) for a pointy top
    const angle = ((2 * Math.PI) / 6) * side + Math.PI / 6;
    const vertexX = x + size * Math.cos(angle);
    const vertexY = y + size * Math.sin(angle);
    if (side === 0) {
      ctx.moveTo(vertexX, vertexY);
    } else {
      ctx.lineTo(vertexX, vertexY);
    }
  }
  ctx.closePath();
  ctx.strokeStyle = stroke;
  ctx.fillStyle = fill;
  ctx.fill();
  if (asset) {
    ctx.save();
    ctx.clip();

    const scaledSize = size * 2;
    const imageX = x - scaledSize / 2;
    const imageY = y - scaledSize / 2;

    ctx.drawImage(asset, imageX, imageY, scaledSize, scaledSize);

    ctx.restore();
  } else {
  }

  ctx.stroke();
}

function setupCanvas(canvas: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
  return ctx;
}

export function init() {
  const canvas = document.querySelector<HTMLCanvasElement>("#gameCanvas")!;
  canvas.height = window.innerHeight;
  canvas.width = window.innerWidth;
  new BoardGame(canvas);
}

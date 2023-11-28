const resources = ["wood", "brick", "sheep", "wheat", "ore", "desert"] as const;
type Resource = (typeof resources)[number];

const HEX_SIZE = 70;

function get_hex_coords(x: number, y: number, size: number) {
  const q = ((Math.sqrt(3) / 3) * x + (-1 / 3) * y) / size;
  const r = ((2 / 3) * y) / size;
  return { q, r };
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

  constructor(resource: Resource, number: number, q: number, r: number, s: number) {
    super(q, r, s);
    this.resource = resource;
    this.number = number;
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
    this.drawBoard();
  }

  private createGrid() {
    const tiles: ResourceTile[] = [];

    // stare hard at the diagram here: https://www.redblobgames.com/grids/hexagons/#coordinates-cube
    for (let r = -2; r <= 2; r++) {
      for (let q = -2; q <= 2; q++) {
        const s = -q - r;
        if (Math.abs(s) <= 2) {
          const resource = this.getRandomResource();
          const number = this.getRandomNumber();
          tiles.push(new ResourceTile(resource, number, q, r, s));
        }
      }
    }

    return tiles;
  }

  private getRandomResource() {
    const randomResource = Math.floor(Math.random() * resources.length);
    return resources[randomResource];
  }

  private getRandomNumber() {
    return Math.floor(Math.random() * 11) + 2;
  }

  private drawBoard() {
    this.drawBackground();
    [...this.tiles].forEach((tile) => {
      const [x, y] = tile.get2DCoords();
      // const asset = this.assetManager.getAsset(`${tile.resource}tile`);
      const colorMap = {
        wood: "brown",
        brick: "red",
        sheep: "green",
        wheat: "yellow",
        ore: "grey",
        desert: "orange",
      };
      drawHexagon(this.ctx, this.width / 2 + x, this.height / 2 + y, HEX_SIZE, {
        fill: colorMap[tile.resource],
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

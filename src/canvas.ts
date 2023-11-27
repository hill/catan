const resources = ["wood", "brick", "sheep", "wheat", "ore", "desert"] as const;
type Resource = (typeof resources)[number];

class HexTile {
  private resource: Resource;
  private number: number;
  private cubeCoords: { x: number; y: number; z: number };

  constructor(resource: Resource, number: number, x: number, y: number, z: number) {
    this.resource = resource;
    this.number = number;
    this.cubeCoords = { x, y, z };
  }

  public getCoords() {
    return this.cubeCoords;
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

  constructor(canvas: HTMLCanvasElement) {
    this.assetManager = new AssetManager();
    this.loadAssets();
    this.canvas = canvas;
    this.ctx = setupCanvas(canvas);
    const dpr = window.devicePixelRatio || 1;
    this.width = canvas.width / dpr;
    this.height = canvas.height / dpr;

    this.initializeGame();
  }

  private async initializeGame() {
    await this.loadAssets();
    this.drawBoard();
  }

  private drawBoard() {
    this.drawBackground();
    const hexsize = 50;
    const startY = this.height / 6;
    const startX = this.width / 2;
    const boardLayout = [3, 4, 5, 4, 3];
    const hexWidth = hexsize * 2;
    const hexHeight = Math.sqrt(3) * hexsize;
    const verticalSpacing = hexHeight;

    let currentY = startY;
    for (let row = 0; row < boardLayout.length; row++) {
      const hexagonsInRow = boardLayout[row];
      const rowWidth = hexWidth * hexagonsInRow;
      let currentX = startX - rowWidth / 2 + hexsize; // Centering each row

      for (let col = 0; col < hexagonsInRow; col++) {
        const randomResource = Math.floor(Math.random() * resources.length);
        const asset = this.assetManager.getAsset(`${resources[randomResource]}tile`);
        drawHexagon(this.ctx, currentX, currentY, hexsize, asset);
        currentX += hexWidth;
      }
      currentY += verticalSpacing;
    }
  }

  private drawBackground() {
    this.ctx.fillStyle = "black";
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
  asset?: HTMLImageElement
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
  ctx.fillStyle = "white";
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
  new BoardGame(canvas);
}

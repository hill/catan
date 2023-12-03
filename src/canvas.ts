import { PointyHexTile, vectorToDirection } from "./hex";

const resources = ["wood", "brick", "sheep", "wheat", "ore", "desert"] as const;
type Resource = (typeof resources)[number];

class ResourceTile extends PointyHexTile {
	public resource: Resource;
	public number: number;

	constructor(q: number, r: number, s: number, size: number) {
		super(q, r, s, size);
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

class PlaceholderTile extends PointyHexTile {}

type GameTile = ResourceTile | PlaceholderTile;

class Road {
	public tiles: [GameTile, GameTile];

	constructor(tiles: [GameTile, GameTile]) {
		if (!tiles[0].isNeighbour(tiles[1])) {
			throw new Error("Road tiles must be neighbours");
		}

		this.tiles = tiles;
	}

	get angle() {
		const [tile1, tile2] = this.tiles;
		const direction = vectorToDirection(tile1.coords, tile2.coords);

		const angleMap = {
			northEast: 30,
			east: 90,
			southEast: 150,
			southWest: 210,
			west: 270,
			northWest: 330,
		};

		return angleMap[direction];
	}

	public get2DCoords() {
		const [tile1, tile2] = this.tiles;
		const [tile1X, tile1Y] = tile1.get2DCoords();
		const [tile2X, tile2Y] = tile2.get2DCoords();
		return [(tile1X + tile2X) / 2, (tile1Y + tile2Y) / 2];
	}
}

class Settlement {
	public tiles: [GameTile, GameTile, GameTile];

	constructor(tiles: [GameTile, GameTile, GameTile]) {
		// the tiles must be neighbors of each other
		if (
			!tiles.every((tile, i, arr) => {
				return tile.isNeighbour(arr[(i + 1) % arr.length]);
			})
		) {
			throw new Error("Settlement tiles must be neighbours");
		}

		this.tiles = tiles;
	}

	public get2DCoords() {
		const [tile1, tile2, tile3] = this.tiles;
		const [tile1X, tile1Y] = tile1.get2DCoords();
		const [tile2X, tile2Y] = tile2.get2DCoords();
		const [tile3X, tile3Y] = tile3.get2DCoords();
		return [(tile1X + tile2X + tile3X) / 3, (tile1Y + tile2Y + tile3Y) / 3];
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

	public loadManyAssets(assets: [string, string][]) {
		return Promise.all(assets.map(([name, url]) => this.loadAsset(name, url)));
	}
}

class BoardGame {
	private assetManager: AssetManager;
	private canvas: HTMLCanvasElement;
	private ctx!: CanvasRenderingContext2D;
	private width!: number;
	private height!: number;
	private mouse: { x: number; y: number } | null = null;
	private tileSize!: number;
	private tiles: GameTile[];
	private roads: Road[] = [];
	private settlements: Settlement[] = [];

	constructor(canvas: HTMLCanvasElement) {
		this.assetManager = new AssetManager();
		this.loadAssets();
		this.canvas = canvas;
		this.setupCanvasScaling();
		this.tiles = this.createGrid();
		this.roads.push(new Road([this.resourceTiles[0], this.resourceTiles[4]]));
		this.roads.push(new Road([this.resourceTiles[8], this.resourceTiles[9]]));
		this.settlements.push(
			new Settlement([
				this.resourceTiles[0],
				this.resourceTiles[1],
				this.resourceTiles[4],
			]),
		);
		this.settlements.push(
			new Settlement([
				this.resourceTiles[8],
				this.resourceTiles[9],
				this.resourceTiles[13],
			]),
		);

		this.initializeGame();
	}

	get resourceTiles() {
		return this.tiles.filter(
			(tile) => tile instanceof ResourceTile,
		) as ResourceTile[];
	}

	private async initializeGame() {
		await this.loadAssets();

		this.canvas.addEventListener("mousemove", (event) => {
			const rect = this.canvas.getBoundingClientRect();
			this.mouse = {
				x: event.clientX - rect.left - this.width / 2, // transform to center of canvas
				y: event.clientY - rect.top - this.height / 2,
			};
			this.drawBoard();
		});

		this.canvas.addEventListener("mouseleave", () => {
			this.mouse = null;
			this.drawBoard();
		});

		window.addEventListener("resize", () => {
			this.setupCanvasScaling();
			this.updateAllTileSize();
			this.drawBoard();
		});

		this.drawBoard();
	}

	private createGrid() {
		const tiles: (ResourceTile | PlaceholderTile)[] = [];
		const radius = 3;
		// stare hard at the diagram here: https://www.redblobgames.com/grids/hexagons/#coordinates-cube
		for (let r = -radius; r <= radius; r++) {
			for (let q = -radius; q <= radius; q++) {
				const s = -q - r;
				if (Math.abs(s) <= radius) {
					if (
						Math.abs(q) === radius ||
						Math.abs(r) === radius ||
						Math.abs(s) === radius
					) {
						// In the outer ring, push a placeholder tile
						tiles.push(new PlaceholderTile(q, r, s, this.tileSize));
					} else {
						tiles.push(new ResourceTile(q, r, s, this.tileSize));
					}
				}
			}
		}
		return tiles;
	}

	private findTileAt(x: number, y: number): GameTile | undefined {
		for (const tile of this.tiles) {
			const [tileX, tileY] = tile.get2DCoords();
			const distance = Math.sqrt((x - tileX) ** 2 + (y - tileY) ** 2);
			if (distance < this.tileSize) {
				return tile;
			}
		}
		return undefined;
	}

	private setupCanvasScaling() {
		this.canvas.height = window.innerHeight;
		this.canvas.width = window.innerWidth;
		const dpr = window.devicePixelRatio || 1;
		const rect = this.canvas.getBoundingClientRect();
		this.canvas.width = rect.width * dpr;
		this.canvas.height = rect.height * dpr;
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		const ctx = this.canvas.getContext("2d")!;
		ctx.scale(dpr, dpr);
		this.ctx = ctx;

		this.width = this.canvas.width / dpr;
		this.height = this.canvas.height / dpr;
		this.tileSize = 0.07 * this.width;
	}

	private updateAllTileSize() {
		for (const tile of this.tiles) {
			tile.size = this.tileSize;
		}
	}

	private drawBoard() {
		this.drawBackground();
		this.ctx.save();
		this.ctx.translate(this.width / 2, this.height / 2); // Translate to the center

		const mouseOverTile =
			this.mouse && this.findTileAt(this.mouse.x, this.mouse.y);

		for (const tile of this.resourceTiles) {
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

			drawHexagon(this.ctx, x, y, this.tileSize, {
				fill: colorMap[tile.resource] + (highlight ? "CC" : "FF"),
			});
			// draw some text in the middle of the hexagon with coordinates
			this.ctx.fillStyle = "black";
			this.ctx.font = "12px sans-serif";
			this.ctx.textAlign = "center";
			this.ctx.textBaseline = "middle";
			this.ctx.fillText(`${tile.number}: ${Object.entries(tile.coords)}`, x, y);
		}

		for (const road of this.roads) {
			const [x, y] = road.get2DCoords();
			const angle = road.angle;
			this.ctx.fillStyle = "black";
			this.ctx.beginPath();
			// draw a rectangle with angle
			this.ctx.save();

			this.ctx.translate(x, y);

			const degToRad = (deg: number) => (deg * Math.PI) / 180;

			this.ctx.rotate(degToRad(angle));
			const ROAD_WIDTH = 10;
			this.ctx.fillRect(
				-this.tileSize / 2,
				-(ROAD_WIDTH / 2),
				this.tileSize,
				ROAD_WIDTH,
			);

			this.ctx.restore();

			this.ctx.fill();
		}

		for (const settlement of this.settlements) {
			const [x, y] = settlement.get2DCoords();
			this.ctx.fillStyle = "black";
			this.ctx.beginPath();
			this.ctx.arc(x, y, this.tileSize / 6, 0, 2 * Math.PI);
			this.ctx.fill();
		}

		this.ctx.restore();
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
	},
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

export function init() {
	// biome-ignore lint/style/noNonNullAssertion: <explanation>
	const canvas = document.querySelector<HTMLCanvasElement>("#gameCanvas")!;
	canvas.height = window.innerHeight;
	canvas.width = window.innerWidth;
	new BoardGame(canvas);
}

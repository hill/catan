import {
	CubeCoordinate,
	PointyHexTile,
	edgeDirections,
	vectorToDirection,
} from "./hex";
import shapes, {
	Circle,
	Drawable,
	PointyHexagon as PointyHexagonShape,
	Rectangle,
} from "./shapes";

const resources = ["wood", "brick", "sheep", "wheat", "ore", "desert"] as const;
type Resource = (typeof resources)[number];

const degToRad = (deg: number) => (deg * Math.PI) / 180;

interface HasShape {
	shape: Drawable;
}

interface MouseHandler {
	isMouseOver: boolean;
	onMouseIn(): void;
	onMouseOut(): void;
	onClick(): void;
	shape: Drawable;
}

class ResourceTile extends PointyHexTile implements HasShape, MouseHandler {
	public isMouseOver = false;
	public resource: Resource;
	public number: number;
	public shape: PointyHexagonShape;

	constructor(q: number, r: number, s: number, size: number) {
		super(q, r, s, size);
		this.resource = this.getRandomResource();
		this.number = this.getRandomNumber();
		const [x, y] = this.get2DCoords();
		const colorMap = {
			wood: "#378805",
			brick: "#8B4513",
			sheep: "#00FF00",
			wheat: "#FFD700",
			ore: "#808080",
			desert: "#F5DEB3",
		};
		this.shape = new shapes.PointyHexagon(
			x,
			y,
			size,
			colorMap[this.resource],
			"black",
		);
	}

	private getRandomResource() {
		const randomResource = Math.floor(Math.random() * resources.length);
		return resources[randomResource];
	}

	private getRandomNumber() {
		return Math.floor(Math.random() * 11) + 2;
	}

	public onClick() {}

	public onMouseIn() {
		this.shape;
	}

	public onMouseOut() {}
}

class PlaceholderTile extends PointyHexTile {}

type GameTile = ResourceTile | PlaceholderTile;

class Road implements HasShape, MouseHandler {
	public isMouseOver = false;
	public tiles: [GameTile, GameTile];
	public shape: Rectangle;

	constructor(tiles: [GameTile, GameTile]) {
		if (!tiles[0].isNeighbour(tiles[1])) {
			throw new Error("Road tiles must be neighbours");
		}

		this.tiles = tiles;

		const TILE_SIZE = tiles[0].size; // TODO: this is a hack
		const ROAD_WIDTH = 10;

		this.shape = new shapes.Rectangle(
			-(TILE_SIZE / 2),
			-(ROAD_WIDTH / 2),
			TILE_SIZE,
			ROAD_WIDTH,
			"black",
			this.angle,
		);
	}

	public draw(ctx: CanvasRenderingContext2D) {
		const [x, y] = this.get2DCoords();
		ctx.save();
		ctx.translate(x, y);
		this.shape.draw(ctx);
		ctx.restore();
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

		return degToRad(angleMap[direction]);
	}

	public get2DCoords() {
		const [tile1, tile2] = this.tiles;
		const [tile1X, tile1Y] = tile1.get2DCoords();
		const [tile2X, tile2Y] = tile2.get2DCoords();
		return [(tile1X + tile2X) / 2, (tile1Y + tile2Y) / 2];
	}

	public onClick() {}

	public onMouseIn() {}

	public onMouseOut() {}
}

class Settlement implements HasShape, MouseHandler {
	public isMouseOver = false;
	public tiles: [GameTile, GameTile, GameTile];
	public shape: Circle;

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
		const [x, y] = this.get2DCoords();
		const TILE_SIZE = tiles[0].size; // TODO: this is a hack
		const r = TILE_SIZE / 6;
		this.shape = new shapes.Circle(x, y, r, "black");
	}

	public get2DCoords() {
		const [tile1, tile2, tile3] = this.tiles;
		const [tile1X, tile1Y] = tile1.get2DCoords();
		const [tile2X, tile2Y] = tile2.get2DCoords();
		const [tile3X, tile3Y] = tile3.get2DCoords();
		return [(tile1X + tile2X + tile3X) / 3, (tile1Y + tile2Y + tile3Y) / 3];
	}

	public onClick() {}

	public onMouseIn() {}

	public onMouseOut() {}
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

	private tileCoordMap = new Map<string, GameTile>();
	private roadCoordMap = new Map<string, Road>();
	private settlementCoordMap = new Map<string, Settlement>();

	constructor(canvas: HTMLCanvasElement) {
		this.assetManager = new AssetManager();
		this.loadAssets();
		this.canvas = canvas;
		this.setupCanvasScaling();
		this.tiles = this.createGrid();
		this.createAllLocations();

		this.initializeGame();
	}

	private getCoordHash(coords: CubeCoordinate[]) {
		return coords
			.map(({ q, r, s }) => `${q},${r},${s}`)
			.sort()
			.join("|");
	}

	get tiles() {
		return Array.from(this.tileCoordMap.values());
	}

	set tiles(tiles: GameTile[]) {
		this.tileCoordMap = new Map(
			tiles.map((tile) => [this.getCoordHash([tile.coords]), tile]),
		);
	}

	get roads() {
		return Array.from(this.roadCoordMap.values());
	}

	set roads(roads: Road[]) {
		this.roadCoordMap = new Map(
			roads.map((road) => [
				this.getCoordHash(road.tiles.map((tile) => tile.coords)),
				road,
			]),
		);
	}

	get settlements() {
		return Array.from(this.settlementCoordMap.values());
	}

	set settlements(settlements: Settlement[]) {
		this.settlementCoordMap = new Map(
			settlements.map((settlement) => [
				this.getCoordHash(settlement.tiles.map((tile) => tile.coords)),
				settlement,
			]),
		);
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

			for (const mouseListener of this.mouseListeners) {
				const isOver = mouseListener.shape.contains(this.mouse.x, this.mouse.y);

				if (isOver && !mouseListener.isMouseOver) {
					mouseListener.isMouseOver = true;
					mouseListener.onMouseIn();
				} else if (!isOver && mouseListener.isMouseOver) {
					mouseListener.isMouseOver = false;
					mouseListener.onMouseOut();
				}
			}

			this.drawBoard();
		});

		this.canvas.addEventListener("click", (event) => {
			if (this.mouse) {
				for (const mouseListener of this.mouseListeners) {
					if (mouseListener.shape.contains(this.mouse.x, this.mouse.y)) {
						mouseListener.onClick();
					}
				}
			}
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

	private createAllLocations() {
		const roads = [];
		for (const tile of this.resourceTiles) {
			for (const direction of edgeDirections) {
				const coords = tile.getNeighbourCoords(direction);
				const neighbour = this.getTileAtCoords(coords);
				if (neighbour) {
					const road = new Road([tile, neighbour]);
					// TODO: If a road already exists between the two tiles, don't create a new one
					if (
						!this.roadCoordMap.has(
							this.getCoordHash(road.tiles.map((tile) => tile.coords)),
						)
					) {
						roads.push(new Road([tile, neighbour]));
					}
				}
			}
		}
		this.roads = roads;

		const settlements = [];
		for (const tile of this.resourceTiles) {
			const vertexCoords = tile.getAllVertexCoords();
			for (const coords of Object.values(vertexCoords)) {
				if (!this.settlementCoordMap.has(this.getCoordHash(coords))) {
					const tiles = coords
						.map((coord) => this.getTileAtCoords(coord))
						.filter((tile) => tile !== undefined) as [
						GameTile,
						GameTile,
						GameTile,
					]; // TODO: remove cast
					settlements.push(new Settlement(tiles));
				}
			}
		}
		this.settlements = settlements;
	}

	private getTileAtCoords(coords: CubeCoordinate) {
		return this.tileCoordMap.get(this.getCoordHash([coords]));
	}

	private get mouseListeners(): MouseHandler[] {
		return [...this.roads, ...this.settlements, ...this.resourceTiles];
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

		for (const tile of this.resourceTiles) {
			tile.shape.draw(this.ctx);
		}
		for (const road of this.roads) {
			road.draw(this.ctx);
		}
		for (const settlement of this.settlements) {
			settlement.shape.draw(this.ctx);
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

export function init() {
	// biome-ignore lint/style/noNonNullAssertion: <explanation>
	const canvas = document.querySelector<HTMLCanvasElement>("#gameCanvas")!;
	canvas.height = window.innerHeight;
	canvas.width = window.innerWidth;
	const game = new BoardGame(canvas);
	console.log(game);
}

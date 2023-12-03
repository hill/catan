function cubeRound({ q, r, s }: { q: number; r: number; s: number }) {
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

function getHexCoords(x: number, y: number, size: number) {
	const q = ((Math.sqrt(3) / 3) * x + (-1 / 3) * y) / size;
	const r = ((2 / 3) * y) / size;
	const { q: q_rounded, r: r_rounded } = cubeRound({ q, r, s: -q - r });
	return { q: q_rounded, r: r_rounded };
}

export type CubeCoordinate = { q: number; r: number; s: number };
const vertexDirections = [
	"north",
	"northEast",
	"southEast",
	"south",
	"southWest",
	"northWest",
] as const;
type VertexDirection = (typeof vertexDirections)[number];
export type VertexCoord = CubeCoordinate[];
const edgeDirections = [
	"northEast",
	"east",
	"southEast",
	"southWest",
	"west",
	"northWest",
] as const;
export type EdgeCoord = [CubeCoordinate, CubeCoordinate];
export type EdgeDirection = (typeof edgeDirections)[number];

const CUBE_DIRECTION_VECTORS: Record<EdgeDirection, CubeCoordinate> = {
	northEast: { q: 1, r: -1, s: 0 },
	east: { q: 1, r: 0, s: -1 },
	southEast: { q: 0, r: 1, s: -1 },
	southWest: { q: -1, r: 1, s: 0 },
	west: { q: -1, r: 0, s: 1 },
	northWest: { q: 0, r: -1, s: 1 },
};

export function vectorToDirection(from: CubeCoordinate, to: CubeCoordinate) {
	return Object.entries(CUBE_DIRECTION_VECTORS).find(
		([, vector]) =>
			vector.q === to.q - from.q &&
			vector.r === to.r - from.r &&
			vector.s === to.s - from.s,
	)?.[0] as EdgeDirection;
}

export function coordinatesAreEqual(a: CubeCoordinate, b: CubeCoordinate) {
	return a.q === b.q && a.r === b.r && a.s === b.s;
}

export function verticiesAreEqual(a: CubeCoordinate[], b: CubeCoordinate[]) {
	return a.every((a_coord) =>
		b.some((b_coord) => coordinatesAreEqual(a_coord, b_coord)),
	);
}

export function edgesAreEqual(a: CubeCoordinate[], b: CubeCoordinate[]) {
	return a.every((a_coord) =>
		b.some((b_coord) => coordinatesAreEqual(a_coord, b_coord)),
	);
}

export class PointyHexTile {
	private cubeCoords: CubeCoordinate;
	public size: number;

	constructor(q: number, r: number, s: number, size: number) {
		this.cubeCoords = { q, r, s };
		this.size = size;
	}

	get coords() {
		return this.cubeCoords;
	}

	public get2DCoords() {
		// https://www.redblobgames.com/grids/hexagons/#hex-to-pixel-axial
		const { q, r } = this.cubeCoords;
		const x = this.size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
		const y = this.size * ((3 / 2) * r);
		return [x, y];
	}

	public getNeighbourCoords(direction: EdgeDirection) {
		const { q, r, s } = this.cubeCoords;
		const {
			q: q_offset,
			r: r_offset,
			s: s_offset,
		} = CUBE_DIRECTION_VECTORS[direction];
		return { q: q + q_offset, r: r + r_offset, s: s + s_offset };
	}

	public getAllVertexCoords(): Record<VertexDirection, VertexCoord> {
		return vertexDirections.reduce(
			(acc: Record<VertexDirection, VertexCoord>, direction) => {
				acc[direction] = this.getVertexCoords(direction);
				return acc;
			},
			{} as Record<VertexDirection, VertexCoord>,
		);
	}

	public getVertexCoords(direction: VertexDirection) {
		const vertexToEdgeNeighbours: Record<
			VertexDirection,
			[EdgeDirection, EdgeDirection]
		> = {
			north: ["northWest", "northEast"],
			northEast: ["northEast", "east"],
			southEast: ["east", "southEast"],
			south: ["southEast", "southWest"],
			southWest: ["southWest", "west"],
			northWest: ["west", "northWest"],
		};

		const neighbours = vertexToEdgeNeighbours[direction];

		return [
			this.cubeCoords,
			this.getNeighbourCoords(neighbours[0]),
			this.getNeighbourCoords(neighbours[1]),
		];
	}

	public getAllEdgeCoords(): Record<EdgeDirection, EdgeCoord> {
		return edgeDirections.reduce(
			(acc: Record<EdgeDirection, EdgeCoord>, direction) => {
				acc[direction] = this.getEdgeCoords(direction);
				return acc;
			},
			{} as Record<EdgeDirection, EdgeCoord>,
		);
	}

	public getEdgeCoords(direction: EdgeDirection): EdgeCoord {
		return [this.cubeCoords, this.getNeighbourCoords(direction)];
	}

	public isNeighbour(other: PointyHexTile) {
		for (const direction of edgeDirections) {
			const neighbourCoords = this.getNeighbourCoords(direction);
			if (coordinatesAreEqual(neighbourCoords, other.coords)) {
				return true;
			}
		}
		return false;
	}
}

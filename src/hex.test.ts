import { describe, expect, test } from "bun:test";
import { PointyHexTile, edgesAreEqual, verticiesAreEqual } from "./hex";

// bun does not support array checks yet so gonna just write my own
// biome-ignore lint/suspicious/noExplicitAny: Test utility
function arrayContainsExpected(array: any[], expected: any[] | any): boolean {
	// deep check for objects in the array
	if (Array.isArray(expected)) {
		return expected.every((expectedItem) =>
			arrayContainsExpected(array, expectedItem),
		);
	}

	if (typeof expected === "object") {
		return array.some(
			(arrayItem) => JSON.stringify(arrayItem) === JSON.stringify(expected),
		);
	}

	return array.some((arrayItem) => arrayItem === expected);
}

// biome-ignore lint/suspicious/noExplicitAny: Test utility
function expectArrayToContain(array: any[], expected: any[] | any) {
	expect(arrayContainsExpected(array, expected)).toBe(true);
}

describe("PointyHexTile", () => {
	test("getAllVertexCoords", () => {
		const origin = new PointyHexTile(0, 0, 0, 1);
		const vertexCoords = origin.getAllVertexCoords();

		expectArrayToContain(vertexCoords.north, [
			{ q: 0, r: 0, s: 0 },
			{ q: 0, r: -1, s: 1 },
			{ q: 1, r: -1, s: 0 },
		]);

		expectArrayToContain(vertexCoords.northEast, [
			{ q: 0, r: 0, s: 0 },
			{ q: 1, r: 0, s: -1 },
			{ q: 1, r: -1, s: 0 },
		]);

		expectArrayToContain(vertexCoords.southEast, [
			{ q: 0, r: 0, s: 0 },
			{ q: 1, r: 0, s: -1 },
			{ q: 0, r: 1, s: -1 },
		]);

		expectArrayToContain(vertexCoords.south, [
			{ q: 0, r: 0, s: 0 },
			{ q: 0, r: 1, s: -1 },
			{ q: -1, r: 1, s: 0 },
		]);

		expectArrayToContain(vertexCoords.southWest, [
			{ q: 0, r: 0, s: 0 },
			{ q: -1, r: 0, s: 1 },
			{ q: -1, r: 1, s: 0 },
		]);

		expectArrayToContain(vertexCoords.northWest, [
			{ q: 0, r: 0, s: 0 },
			{ q: -1, r: 0, s: 1 },
			{ q: 0, r: -1, s: 1 },
		]);
	});

	test("verticiesAreEqual", () => {
		const tile1 = new PointyHexTile(0, 0, 0, 1);
		const tile2 = new PointyHexTile(1, -1, 0, 1);

		expect(
			verticiesAreEqual(
				tile1.getVertexCoords("north"),
				tile2.getVertexCoords("southWest"),
			),
		).toBe(true);
		expect(
			verticiesAreEqual(
				tile1.getVertexCoords("northEast"),
				tile2.getVertexCoords("south"),
			),
		).toBe(true);

		expect(
			verticiesAreEqual(
				tile1.getVertexCoords("north"),
				tile2.getVertexCoords("south"),
			),
		).toBe(false);
	});

	test("getAllEdgeCoords", () => {
		const origin = new PointyHexTile(0, 0, 0, 1);
		const edgeCoords = origin.getAllEdgeCoords();

		expectArrayToContain(edgeCoords.northEast, [
			{ q: 0, r: 0, s: 0 },
			{ q: 1, r: -1, s: 0 },
		]);

		expectArrayToContain(edgeCoords.east, [
			{ q: 0, r: 0, s: 0 },
			{ q: 1, r: 0, s: -1 },
		]);

		expectArrayToContain(edgeCoords.southEast, [
			{ q: 0, r: 0, s: 0 },
			{ q: 0, r: 1, s: -1 },
		]);

		expectArrayToContain(edgeCoords.southWest, [
			{ q: 0, r: 0, s: 0 },
			{ q: -1, r: 1, s: 0 },
		]);

		expectArrayToContain(edgeCoords.northWest, [
			{ q: 0, r: 0, s: 0 },
			{ q: 0, r: -1, s: 1 },
		]);

		expectArrayToContain(edgeCoords.west, [
			{ q: 0, r: 0, s: 0 },
			{ q: -1, r: 0, s: 1 },
		]);
	});

	test("edgesAreEqual", () => {
		const origin = new PointyHexTile(0, 0, 0, 1);
		const northEast = new PointyHexTile(1, -1, 0, 1);
		const west = new PointyHexTile(-1, 0, 1, 1);

		expect(
			edgesAreEqual(
				origin.getEdgeCoords("northEast"),
				northEast.getEdgeCoords("southWest"),
			),
		).toBe(true);

		expect(
			edgesAreEqual(origin.getEdgeCoords("west"), west.getEdgeCoords("east")),
		).toBe(true);

		expect(
			edgesAreEqual(
				origin.getEdgeCoords("northEast"),
				west.getEdgeCoords("west"),
			),
		).toBe(false);

		expect(
			edgesAreEqual(
				northEast.getEdgeCoords("west"),
				west.getEdgeCoords("east"),
			),
		).toBe(false);
	});

	test("isNeighbour", () => {
		const origin = new PointyHexTile(0, 0, 0, 1);
		const northEast = new PointyHexTile(1, -1, 0, 1);
		const west = new PointyHexTile(-1, 0, 1, 1);

		expect(origin.isNeighbour(northEast)).toBe(true);
		expect(origin.isNeighbour(west)).toBe(true);
		expect(northEast.isNeighbour(west)).toBe(false);
	});
});

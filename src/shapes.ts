export interface Drawable {
	draw(ctx: CanvasRenderingContext2D): void;
	contains(x: number, y: number): boolean;
}

export class Circle implements Drawable {
	constructor(
		public x: number,
		public y: number,
		public radius: number,
		public fill: string,
	) {}

	draw(ctx: CanvasRenderingContext2D) {
		ctx.fillStyle = this.fill;
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
		ctx.fill();
	}

	contains(x: number, y: number) {
		const dx = x - this.x;
		const dy = y - this.y;
		return dx * dx + dy * dy <= this.radius * this.radius;
	}
}

export class Rectangle implements Drawable {
	constructor(
		public x: number,
		public y: number,
		public width: number,
		public height: number,
		public fill: string,
		public rotation = 0,
	) {}

	draw(ctx: CanvasRenderingContext2D) {
		ctx.save();
		ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
		ctx.rotate(this.rotation);
		ctx.fillStyle = this.fill;
		ctx.fillRect(this.x, this.y, this.width, this.height);
		ctx.restore();
	}

	contains(x: number, y: number) {
		// Translate point and rectangle center to origin
		const centerX = this.x + this.width / 2;
		const centerY = this.y + this.height / 2;
		const translatedX = x - centerX;
		const translatedY = y - centerY;

		// Rotate the point in the opposite direction of the rectangle
		const rotatedX =
			translatedX * Math.cos(-this.rotation) -
			translatedY * Math.sin(-this.rotation);
		const rotatedY =
			translatedX * Math.sin(-this.rotation) +
			translatedY * Math.cos(-this.rotation);

		// Check if the point is inside the unrotated rectangle
		return (
			Math.abs(rotatedX) <= this.width / 2 &&
			Math.abs(rotatedY) <= this.height / 2
		);
	}
}

export class PointyHexagon implements Drawable {
	constructor(
		public x: number,
		public y: number,
		public size: number,
		public fill: string,
		public stroke: string,
	) {}

	draw(ctx: CanvasRenderingContext2D) {
		ctx.beginPath();
		for (let side = 0; side < 7; side++) {
			// Start at an angle of 30 degrees (π/6 radians) for a pointy top
			const angle = ((2 * Math.PI) / 6) * side + Math.PI / 6;
			const vertexX = this.x + this.size * Math.cos(angle);
			const vertexY = this.y + this.size * Math.sin(angle);
			if (side === 0) {
				ctx.moveTo(vertexX, vertexY);
			} else {
				ctx.lineTo(vertexX, vertexY);
			}
		}
		ctx.closePath();
		ctx.strokeStyle = this.stroke;
		ctx.fillStyle = this.fill;
		ctx.fill();

		ctx.stroke();
	}

	contains(x: number, y: number): boolean {
		for (let side = 0; side < 6; side++) {
			// Calculate vertices of each triangle
			const angle1 = ((2 * Math.PI) / 6) * side + Math.PI / 6;
			const angle2 = ((2 * Math.PI) / 6) * (side + 1) + Math.PI / 6;
			const vertex1X = this.x + this.size * Math.cos(angle1);
			const vertex1Y = this.y + this.size * Math.sin(angle1);
			const vertex2X = this.x + this.size * Math.cos(angle2);
			const vertex2Y = this.y + this.size * Math.sin(angle2);

			// Check if point is inside the triangle
			if (
				this.isPointInTriangle(
					x,
					y,
					this.x,
					this.y,
					vertex1X,
					vertex1Y,
					vertex2X,
					vertex2Y,
				)
			) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Uses barycentric coordinates to determine if a point is inside a triangle.
	 * They are generally applicable to triangles in arbitrary dimensions.
	 * @link https://en.wikipedia.org/wiki/Barycentric_coordinate_system
	 * @param px point x
	 * @param py point y
	 * @param ax triangle vertex a x
	 * @param ay triangle vertex a y
	 * @param bx triangle vertex b x
	 * @param by triangle vertex b y
	 * @param cx triangle vertex c x
	 * @param cy triangle vertex c y
	 * @returns boolean
	 */
	private isPointInTriangle(
		px: number,
		py: number,
		ax: number,
		ay: number,
		bx: number,
		by: number,
		cx: number,
		cy: number,
	): boolean {
		const w1 =
			(ax * (cy - ay) + (py - ay) * (cx - ax) - px * (cy - ay)) /
			((by - ay) * (cx - ax) - (bx - ax) * (cy - ay));
		const w2 = (py - ay - w1 * (by - ay)) / (cy - ay);

		return w1 >= 0 && w2 >= 0 && w1 + w2 <= 1;
	}
}

export default {
	Circle,
	Rectangle,
	PointyHexagon,
};

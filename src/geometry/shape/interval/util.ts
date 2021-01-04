import { Coordinate } from '@antv/coord';
import { isArray, isNil } from '@antv/util';
import { PathCommand } from '../../../dependents';
import { Point, ShapePoint } from '../../../interface';

export function parseRadius(radius) {
  let r1 = 0;
  let r2 = 0;
  let r3 = 0;
  let r4 = 0;
  if (isArray(radius)) {
    if (radius.length === 1) {
      r1 = r2 = r3 = r4 = radius[0];
    } else if (radius.length === 2) {
      r1 = r3 = radius[0];
      r2 = r4 = radius[1];
    } else if (radius.length === 3) {
      r1 = radius[0];
      r2 = r4 = radius[1];
      r3 = radius[2];
    } else {
      r1 = radius[0];
      r2 = radius[1];
      r3 = radius[2];
      r4 = radius[3];
    }
  } else {
    r1 = r2 = r3 = r4 = radius;
  }
  return [r1, r2, r3, r4];
}

/**
 * @ignore
 * 根据数据点生成矩形的四个关键点
 * @param pointInfo 数据点信息
 * @param [isPyramid] 是否为尖底漏斗图
 * @returns rect points 返回矩形四个顶点信息
 */
export function getRectPoints(pointInfo: ShapePoint, isPyramid = false): Point[] {
  const { x, y, y0, size } = pointInfo;
  // 有 4 种情况，
  // 1. x, y 都不是数组
  // 2. y是数组，x不是
  // 3. x是数组，y不是
  // 4. x, y 都是数组
  let yMin;
  let yMax;
  if (isArray(y)) {
    [yMin, yMax] = y;
  } else {
    yMin = y0;
    yMax = y;
  }

  let xMin;
  let xMax;
  if (isArray(x)) {
    [xMin, xMax] = x;
  } else {
    xMin = x - size / 2;
    xMax = x + size / 2;
  }

  const points = [
    { x: xMin, y: yMin },
    { x: xMin, y: yMax },
  ];

  if (isPyramid) {
    // 绘制尖底漏斗图
    // 金字塔漏斗图的关键点
    // 1
    // |   2
    // 0
    points.push({
      x: xMax,
      y: (yMax + yMin) / 2,
    });
  } else {
    // 矩形的四个关键点，结构如下（左下角顺时针连接）
    // 1 ---- 2
    // |      |
    // 0 ---- 3
    points.push({ x: xMax, y: yMax }, { x: xMax, y: yMin });
  }

  return points;
}

/**
 * @ignore
 * 根据矩形关键点绘制 path
 * @param points 关键点数组
 * @param isClosed path 是否需要闭合
 * @returns 返回矩形的 path
 */
export function getRectPath(points: Point[], isClosed: boolean = true): PathCommand[] {
  const path = [];
  const firstPoint = points[0];
  path.push(['M', firstPoint.x, firstPoint.y]);
  for (let i = 1, len = points.length; i < len; i++) {
    path.push(['L', points[i].x, points[i].y]);
  }
  // 对于 shape="line" path 不应该闭合，否则会造成 lineCap 绘图属性失效
  if (isClosed) {
    path.push(['L', firstPoint.x, firstPoint.y]); // 需要闭合
    path.push(['z']);
  }
  return path;
}

/**
 * @ignore
 * 根据矩形关键点绘制 path
 * @param points 关键点数组
 * @param lineCap 'round'圆角样式
 * @param coor 坐标
 * @returns 返回矩形的 path
 */
export function getIntervalRectPath(
  points: Point[],
  lineCap: CanvasLineCap,
  coor: Coordinate,
  style?: { radius?: number | number[] }
): PathCommand[] {
  const width = coor.getWidth();
  const height = coor.getHeight();
  const isRect = coor.type === 'rect';
  let path = [];
  const r = (points[2].x - points[1].x) / 2;
  const ry = coor.isTransposed ? (r * height) / width : (r * width) / height;
  if (lineCap === 'round') {
    if (isRect) {
      path.push(['M', points[0].x, points[0].y + ry]);
      path.push(['L', points[1].x, points[1].y - ry]);
      path.push(['A', r, r, 0, 0, 1, points[2].x, points[2].y - ry]);
      path.push(['L', points[3].x, points[3].y + ry]);
      path.push(['A', r, r, 0, 0, 1, points[0].x, points[0].y + ry]);
    } else {
      path.push(['M', points[0].x, points[0].y]);
      path.push(['L', points[1].x, points[1].y]);
      path.push(['A', r, r, 0, 0, 1, points[2].x, points[2].y]);
      path.push(['L', points[3].x, points[3].y]);
      path.push(['A', r, r, 0, 0, 1, points[0].x, points[0].y]);
    }
    path.push(['z']);
  } else if (style?.radius) {
    const [r1, r2, r3, r4] = parseRadius(style?.radius);
    const converted = points.map((p) => coor.convert(p));

    path.push(['M', converted[0].x, converted[0].y - r1]);
    path.push(['L', converted[1].x, converted[1].y + r2]);
    r2 !== 0 && path.push(['A', r2, r2, 0, 0, 1, converted[1].x + r2, converted[1].y]);
    path.push(['L', converted[2].x - r3, converted[2].y]);
    r3 !== 0 && path.push(['A', r3, r3, 0, 0, 1, converted[2].x, converted[2].y + r3]);
    path.push(['L', converted[3].x, converted[3].y - r4]);
    r4 !== 0 && path.push(['A', r4, r4, 0, 0, 1, converted[3].x - r4, converted[3].y]);
    path.push(['L', converted[0].x + r1, converted[0].y]);
    r1 !== 0 && path.push(['A', r1, r1, 0, 0, 1, converted[0].x, converted[0].y - r1]);

    path.forEach((p) => {
      const [x, y] = p.slice(-2);
      const inverted = coor.invertPoint({ x, y });
      p.splice(-2, 2, inverted.x, inverted.y);
    });

    path.push(['z']);
  } else {
    path = getRectPath(points);
  }
  return path;
}

/**
 * @ignore
 * 根据 funnel 关键点绘制漏斗图的 path
 * @param points 图形关键点信息
 * @param nextPoints 下一个数据的图形关键点信息
 * @param isPyramid 是否为尖底漏斗图
 * @returns 返回漏斗图的图形 path
 */
export function getFunnelPath(points: Point[], nextPoints: Point[], isPyramid: boolean) {
  const path = [];
  if (!isNil(nextPoints)) {
    path.push(
      ['M', points[0].x, points[0].y],
      ['L', points[1].x, points[1].y],
      ['L', nextPoints[1].x, nextPoints[1].y],
      ['L', nextPoints[0].x, nextPoints[0].y],
      ['Z']
    );
  } else if (isPyramid) {
    // 金字塔最底部
    path.push(
      ['M', points[0].x, points[0].y],
      ['L', points[1].x, points[1].y],
      ['L', points[2].x, points[2].y],
      ['L', points[2].x, points[2].y],
      ['Z']
    );
  } else {
    // 漏斗图最底部
    path.push(
      ['M', points[0].x, points[0].y],
      ['L', points[1].x, points[1].y],
      ['L', points[2].x, points[2].y],
      ['L', points[3].x, points[3].y],
      ['Z']
    );
  }

  return path;
}

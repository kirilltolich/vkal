import { useEffect, useRef, useState } from 'react';
import type { BacResult } from '../utils/bac';
import { formatClockAt, formatNumber } from '../utils/format';

interface BloodChartProps {
  result: BacResult;
}

/** Округление верхней границы оси Y до читаемого шага. */
function niceCeiling(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0.25;
  const step = value <= 0.5 ? 0.1 : value <= 1.2 ? 0.25 : value <= 3 ? 0.5 : 1;
  return Math.max(step, Math.ceil(value / step) * step);
}

/**
 * График рисуется в координатах реального размера контейнера: так подписи
 * остаются одного размера и на телефоне, и на большом экране.
 */
export function BloodChart({ result }: BloodChartProps) {
  const figureRef = useRef<HTMLElement>(null);
  const [size, setSize] = useState({ width: 760, height: 330 });

  useEffect(() => {
    const holder = figureRef.current;
    if (!holder) return;

    const update = () => {
      const width = Math.max(260, Math.round(holder.clientWidth));
      const height = Math.round(Math.min(400, Math.max(230, width * 0.44)));
      setSize((previous) =>
        previous.width === width && previous.height === height ? previous : { width, height },
      );
    };

    update();

    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(update);
      observer.observe(holder);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const compact = size.width < 470;
  const pad = {
    top: compact ? 26 : 30,
    right: compact ? 16 : 20,
    bottom: compact ? 42 : 48,
    left: compact ? 46 : 64,
  };
  const plotW = Math.max(80, size.width - pad.left - pad.right);
  const plotH = Math.max(80, size.height - pad.top - pad.bottom);

  const { curve, startAt } = result;
  const lastMinutes = Math.max(60, curve[curve.length - 1]?.minutes ?? 60);
  const yMax = niceCeiling(
    Math.max(result.peakPerMille, result.uncertainty.currentPerMilleMax) * 1.15,
  );

  const x = (minutes: number) =>
    pad.left + (Math.max(0, Math.min(minutes, lastMinutes)) / lastMinutes) * plotW;
  const y = (perMille: number) =>
    pad.top + plotH - (Math.max(0, Math.min(perMille, yMax)) / yMax) * plotH;
  const toPoint = (minutes: number, perMille: number) =>
    `${x(minutes).toFixed(1)},${y(perMille).toFixed(1)}`;

  const past = curve.filter((point) => point.minutes <= result.nowMinutes);
  const future = curve.filter((point) => point.minutes >= result.nowMinutes);
  const pastLine = past.map((point) => toPoint(point.minutes, point.perMille)).join(' ');
  const futureLine = future.map((point) => toPoint(point.minutes, point.perMille)).join(' ');
  const area = [
    toPoint(0, 0),
    ...curve.map((point) => toPoint(point.minutes, point.perMille)),
    toPoint(lastMinutes, 0),
  ].join(' ');

  const yTicks = [0, 1, 2, 3, 4].map((index) => (yMax * index) / 4);
  const xTickCount = compact ? 3 : 5;
  const xTicks = Array.from({ length: xTickCount }, (_, index) =>
    (lastMinutes * index) / (xTickCount - 1),
  );

  const nowVisible = result.nowMinutes <= lastMinutes;
  const peakVisible = result.peakMinutes <= lastMinutes && result.peakPerMille > 0;
  const peakOnTheRight = result.peakMinutes / lastMinutes > 0.7;
  const nowOnTheRight = result.nowMinutes / lastMinutes > 0.72;

  const peakLabel = compact
    ? `пик ${formatNumber(result.peakPerMille, 2)}`
    : `пик ${formatNumber(result.peakPerMille, 2)} ‰ · ${formatClockAt(startAt, result.peakMinutes)}`;
  const nowLabel = compact
    ? `сейчас ${formatNumber(result.currentPerMille, 2)}`
    : `сейчас ${formatNumber(result.currentPerMille, 2)} ‰`;

  const ariaLabel = `Расчётная кривая концентрации алкоголя. Сейчас ${formatNumber(
    result.currentPerMille,
    2,
  )} промилле, пик ${formatNumber(result.peakPerMille, 2)} промилле около ${formatClockAt(
    startAt,
    result.peakMinutes,
  )}.`;

  const axisFontSize = compact ? 12 : 13;
  const titleFontSize = compact ? 11 : 12;
  const markerFontSize = compact ? 11.5 : 13;

  return (
    <figure className="blood-chart" ref={figureRef}>
      <svg
        className="blood-chart-svg"
        viewBox={`0 0 ${size.width} ${size.height}`}
        style={{ height: `${size.height}px` }}
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          <linearGradient id="blood-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(198, 255, 46, 0.3)" />
            <stop offset="100%" stopColor="rgba(198, 255, 46, 0.02)" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => (
          <g key={`y-${tick}`}>
            <line
              x1={pad.left}
              y1={y(tick)}
              x2={pad.left + plotW}
              y2={y(tick)}
              className="blood-grid-line"
            />
            <text
              x={pad.left - 10}
              y={y(tick) + axisFontSize * 0.35}
              className="blood-axis-text"
              style={{ fontSize: `${axisFontSize}px` }}
              textAnchor="end"
            >
              {formatNumber(tick, tick < 1 ? 2 : 1)}
            </text>
          </g>
        ))}

        {xTicks.map((minutes, index) => (
          <g key={`x-${index}`}>
            <line
              x1={x(minutes)}
              y1={pad.top}
              x2={x(minutes)}
              y2={pad.top + plotH}
              className="blood-grid-line blood-grid-line-vertical"
            />
            <text
              x={x(minutes)}
              y={pad.top + plotH + axisFontSize + 12}
              className="blood-axis-text"
              style={{ fontSize: `${axisFontSize}px` }}
              textAnchor={index === 0 ? 'start' : index === xTicks.length - 1 ? 'end' : 'middle'}
            >
              {formatClockAt(startAt, minutes)}
            </text>
          </g>
        ))}

        <polygon points={area} fill="url(#blood-area)" />

        <polyline points={pastLine} className="blood-line blood-line-past" />
        {future.length > 1 ? (
          <polyline points={futureLine} className="blood-line blood-line-future" />
        ) : null}

        <text
          x={pad.left}
          y={pad.top - 12}
          className="blood-axis-title"
          style={{ fontSize: `${titleFontSize}px` }}
        >
          ‰ в крови — расчёт
        </text>
        {!compact ? (
          <text
            x={pad.left + plotW}
            y={pad.top - 12}
            className="blood-axis-title"
            style={{ fontSize: `${titleFontSize}px` }}
            textAnchor="end"
          >
            время по часам устройства
          </text>
        ) : null}

        {peakVisible ? (
          <g className="blood-marker blood-marker-peak">
            <line
              x1={x(result.peakMinutes)}
              y1={y(result.peakPerMille)}
              x2={x(result.peakMinutes)}
              y2={pad.top + plotH}
            />
            <circle cx={x(result.peakMinutes)} cy={y(result.peakPerMille)} r={5} />
            <text
              x={peakOnTheRight ? x(result.peakMinutes) - 10 : x(result.peakMinutes) + 10}
              y={Math.max(pad.top + markerFontSize, y(result.peakPerMille) - 14)}
              textAnchor={peakOnTheRight ? 'end' : 'start'}
              className="blood-marker-text"
              style={{ fontSize: `${markerFontSize}px` }}
            >
              {peakLabel}
            </text>
          </g>
        ) : null}

        {nowVisible ? (
          <g className="blood-marker blood-marker-now">
            <line x1={x(result.nowMinutes)} y1={pad.top} x2={x(result.nowMinutes)} y2={pad.top + plotH} />
            <circle cx={x(result.nowMinutes)} cy={y(result.currentPerMille)} r={6} />
            <text
              x={nowOnTheRight ? x(result.nowMinutes) - 10 : x(result.nowMinutes) + 10}
              y={y(result.currentPerMille) + 24}
              textAnchor={nowOnTheRight ? 'end' : 'start'}
              className="blood-marker-text"
              style={{ fontSize: `${markerFontSize}px` }}
            >
              {nowLabel}
            </text>
          </g>
        ) : null}
      </svg>

      <figcaption className="blood-chart-note">
        <span className="blood-legend">
          <span className="blood-legend-item">
            <span className="blood-legend-line" aria-hidden="true" /> расчётная кривая
          </span>
          <span className="blood-legend-item">
            <span className="blood-legend-line blood-legend-line-future" aria-hidden="true" /> прогноз дальше
          </span>
          <span className="blood-legend-item">
            <span className="blood-legend-dot" aria-hidden="true" /> сейчас
          </span>
        </span>
        Это расчётный сценарий по модели, а не измерение. Кривая построена по значениям на каждом шаге
        времени, а не по двум точкам.{' '}
        {result.alreadySober
          ? 'Сейчас модель уже ниже условного порога 0,01 ‰.'
          : `Ориентировочно ноль — ${result.zeroAt ? formatClockAt(startAt, result.zeroMinutes ?? 0) : 'за пределами расчёта'}.`}
      </figcaption>
    </figure>
  );
}

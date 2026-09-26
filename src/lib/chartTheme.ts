/**
 * Theme-aware palette for hand-rolled SVG charts, Recharts options, and
 * xyflow node styles. The dark theme is the original design; the light
 * theme picks values with enough contrast on daylight surfaces.
 *
 * Every widget that was hardcoding #253048-style hex values should read
 * from here so charts follow the light/dark toggle.
 */
import { useTheme } from './theme'

export type ChartPalette = {
  /** plot gridlines / axes on the chart background */
  grid: string
  axis: string
  tick: string
  /** primary/secondary series colors (theme-stable accents) */
  accent: string
  highlight: string
  success: string
  danger: string
  primary: string
  muted: string
  ink: string
  /** "ghost" series drawn behind the live one */
  ghost: string
  /** tooltip surface + text */
  tooltipBg: string
  tooltipBorder: string
  tooltipText: string
  /** xyflow node surface + border */
  nodeBg: string
  nodeBorder: string
  nodeText: string
  /** xyflow edge label backgrounds */
  labelBg: string
  /** xyflow colorMode prop */
  colorMode: 'dark' | 'light'
  /** scatterplot node base fill (low-contrast against the plot bg) */
  node: string
}

const DARK: ChartPalette = {
  grid: '#253048',
  axis: '#3f5478',
  tick: '#8b95a8',
  accent: '#22d3ee',
  highlight: '#f59e0b',
  success: '#34d399',
  danger: '#f87171',
  primary: '#6366f1',
  muted: '#8b95a8',
  ink: '#e6ebf4',
  ghost: '#253048',
  tooltipBg: '#111827',
  tooltipBorder: '#253048',
  tooltipText: '#e6ebf4',
  nodeBg: '#1a2332',
  nodeBorder: '#253048',
  nodeText: '#e6ebf4',
  labelBg: '#111827',
  colorMode: 'dark',
  node: '#3b4a63',
}

const LIGHT: ChartPalette = {
  grid: '#d7dfeb',
  axis: '#b4c0d4',
  tick: '#5b6b84',
  accent: '#0e7490',
  highlight: '#b45309',
  success: '#047857',
  danger: '#dc2626',
  primary: '#4f46e5',
  muted: '#5b6b84',
  ink: '#101828',
  ghost: '#d7dfeb',
  tooltipBg: '#ffffff',
  tooltipBorder: '#d7dfeb',
  tooltipText: '#101828',
  nodeBg: '#ffffff',
  nodeBorder: '#c3cede',
  nodeText: '#101828',
  labelBg: '#ffffff',
  colorMode: 'light',
  node: '#93a5c0',
}

/** Reactive chart palette for the current theme. */
export function useChartTheme(): ChartPalette {
  const theme = useTheme()
  return theme === 'light' ? LIGHT : DARK
}

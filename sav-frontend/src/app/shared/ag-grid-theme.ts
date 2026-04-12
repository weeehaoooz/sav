import { themeQuartz } from 'ag-grid-community';

export const savGridTheme = themeQuartz.withParams({
  backgroundColor: 'transparent',
  headerBackgroundColor: 'var(--bg-card)',
  oddRowBackgroundColor: 'var(--bg-input)',
  rowHoverColor: 'var(--bg-card-hover)',
  selectedRowBackgroundColor: 'var(--bg-card-hover)',
  borderColor: 'var(--border-subtle)',
  headerTextColor: 'var(--text-secondary)',
  foregroundColor: 'var(--text-primary)',
  cellTextColor: 'var(--text-primary)',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontSize: 13,
  cellHorizontalPaddingScale: 0.8,
  rowHeight: 48,
  headerHeight: 44,
});

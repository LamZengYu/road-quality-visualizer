// Small shared design tokens used across mobile screens to keep typography
// and color choices consistent. Section headers vs item titles vs metadata
// should look visibly different.
import { StyleSheet } from 'react-native';

export const colors = {
  primary: '#2c3e50',
  text: '#1d1d1f',
  muted: '#6b6b70',
  faint: '#9a9aa0',
  border: '#e5e5ea',
  bg: '#f5f5f7',
  card: '#ffffff',
  accent: '#3498db',
  danger: '#c0392b',
  // grade colors (match web SchematicMap)
  gradeA: '#2ecc71',
  gradeB: '#a3cb38',
  gradeC: '#f1c40f',
  gradeD: '#e67e22',
  gradeF: '#e74c3c',
  sevMinor: '#f1c40f',
  sevModerate: '#e67e22',
  sevSevere: '#e74c3c',
};

export function gradeColor(g: string | null | undefined): string {
  switch (g) {
    case 'A':
      return colors.gradeA;
    case 'B':
      return colors.gradeB;
    case 'C':
      return colors.gradeC;
    case 'D':
      return colors.gradeD;
    case 'F':
      return colors.gradeF;
    default:
      return colors.faint;
  }
}

export function severityColor(s: string): string {
  switch (s) {
    case 'minor':
      return colors.sevMinor;
    case 'moderate':
      return colors.sevModerate;
    case 'severe':
      return colors.sevSevere;
    default:
      return colors.faint;
  }
}

// Common styles. Use t.<name> in StyleSheet arrays to compose with screen-local styles.
export const t = StyleSheet.create({
  pageTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.muted,
    marginTop: 16,
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
  },
  cardPressed: {
    backgroundColor: '#fafafa',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  itemMeta: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 3,
  },
  hint: {
    fontSize: 12,
    color: colors.muted,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  // Pill (used for grade or severity)
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  pillText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  rowSelected: {
    borderColor: colors.accent,
    backgroundColor: '#eef6ff',
  },
});

import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../theme';

export const Card: React.FC<ViewProps> = ({ style, children, ...rest }) => (
  <View {...rest} style={[styles.card, style]}>
    {children}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
});

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ASSET_STATUS_LABELS, type AssetStatus } from '@homeasset/shared';
import { COLORS, RADIUS } from '../theme';

interface Props {
  status: string;
}

export const StatusBadge: React.FC<Props> = ({ status }) => {
  const color = COLORS.badge[status] ?? COLORS.textMuted;
  const label = ASSET_STATUS_LABELS[status as AssetStatus] ?? status;
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
  },
  text: { color: '#fff', fontSize: 12, fontWeight: '700' },
});

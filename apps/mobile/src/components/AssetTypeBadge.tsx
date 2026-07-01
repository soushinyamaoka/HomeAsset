import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ASSET_TYPE_LABELS, type AssetType } from '@homeasset/shared';
import { COLORS, RADIUS } from '../theme';

interface Props {
  assetType: string;
}

export const AssetTypeBadge: React.FC<Props> = ({ assetType }) => {
  const color = COLORS.assetType[assetType] ?? COLORS.textMuted;
  const label = ASSET_TYPE_LABELS[assetType as AssetType] ?? assetType;
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

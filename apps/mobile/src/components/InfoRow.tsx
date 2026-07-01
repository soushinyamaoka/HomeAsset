import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useToast } from './Toast';
import { COLORS, SPACING } from '../theme';

interface Props {
  label: string;
  value?: string | number | null;
  // true なら値が空のとき行ごと非表示（詳細画面の「—」ノイズ削減用）
  hideEmpty?: boolean;
  // true なら値の右にコピーアイコンを表示（ワンタップでクリップボードへ）
  copyable?: boolean;
}

export const InfoRow: React.FC<Props> = ({ label, value, hideEmpty, copyable }) => {
  const toast = useToast();
  const isEmpty = value === null || value === undefined || value === '';
  if (hideEmpty && isEmpty) return null;
  const display = isEmpty ? '—' : String(value);

  const onCopy = async () => {
    await Clipboard.setStringAsync(display);
    toast.show(`${label}をコピーしました`);
  };

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={3} selectable>
        {display}
      </Text>
      {copyable && !isEmpty ? (
        <TouchableOpacity onPress={onCopy} style={styles.copyBtn} hitSlop={8}>
          <Ionicons name="copy-outline" size={18} color={COLORS.textSub} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  label: {
    width: 110,
    color: COLORS.textSub,
    fontSize: 13,
    paddingTop: 2,
  },
  value: { flex: 1, color: COLORS.text, fontSize: 14 },
  copyBtn: { marginLeft: SPACING.sm, paddingTop: 1 },
});

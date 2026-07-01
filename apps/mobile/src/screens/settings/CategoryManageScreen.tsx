import React, { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { ChipSelector } from '../../components/ChipSelector';
import { COLORS, SPACING } from '../../theme';
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
  type Category,
} from '../../api/master';
import { invalidateAssetRelated } from '../../lib/invalidate';
import { ASSET_TYPES, ASSET_TYPE_LABELS } from '@homeasset/shared';

const CategoryManageScreen: React.FC = () => {
  const qc = useQueryClient();
  const { data, refetch, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  const [name, setName] = useState('');
  const [assetType, setAssetType] = useState<string | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const input = { name: name.trim(), assetType: (assetType ?? undefined) as any };
      if (editing) return updateCategory(editing.id, input);
      return createCategory(input);
    },
    onSuccess: () => {
      setName('');
      setAssetType(null);
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (e: any) => Alert.alert('エラー', e?.response?.data?.message ?? String(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
      // 削除で資産側の categoryId が外れるため、資産系キャッシュも更新
      invalidateAssetRelated(qc);
    },
    onError: (e: any) => Alert.alert('削除失敗', e?.response?.data?.message ?? String(e)),
  });

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert('入力エラー', 'カテゴリ名を入力してください');
      return;
    }
    submitMutation.mutate();
  };

  const startEdit = (c: Category) => {
    setEditing(c);
    setName(c.name);
    setAssetType(c.assetType ?? null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg, padding: SPACING.lg }}>
      <Card>
        <TextField
          label={editing ? '編集' : '新規追加'}
          value={name}
          onChangeText={setName}
          placeholder="例: 給湯器、外構"
        />
        <ChipSelector
          label="対応する管理対象種別（任意）"
          options={ASSET_TYPES.map((t) => ({ value: t, label: ASSET_TYPE_LABELS[t] }))}
          value={assetType}
          onChange={setAssetType}
          allowClear
        />
        <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
          {editing ? (
            <View style={{ flex: 1 }}>
              <Button
                title="キャンセル"
                onPress={() => {
                  setEditing(null);
                  setName('');
                  setAssetType(null);
                }}
                variant="outline"
              />
            </View>
          ) : null}
          <View style={{ flex: 1 }}>
            <Button
              title={editing ? '更新' : '追加'}
              onPress={handleSubmit}
              loading={submitMutation.isPending}
            />
          </View>
        </View>
      </Card>

      <FlatList
        data={data ?? []}
        keyExtractor={(c) => c.id}
        refreshing={isLoading}
        onRefresh={() => refetch()}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.assetType ? (
                  <Text style={styles.itemSub}>
                    {ASSET_TYPE_LABELS[item.assetType as keyof typeof ASSET_TYPE_LABELS] ??
                      item.assetType}
                  </Text>
                ) : null}
              </View>
              <View style={{ flexDirection: 'row' }}>
                <TouchableOpacity onPress={() => startEdit(item)} style={styles.iconBtn}>
                  <Ionicons name="create-outline" size={20} color={COLORS.textSub} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    Alert.alert('削除確認', `${item.name} を削除しますか？`, [
                      { text: 'キャンセル', style: 'cancel' },
                      {
                        text: '削除',
                        style: 'destructive',
                        onPress: () => deleteMutation.mutate(item.id),
                      },
                    ])
                  }
                  style={styles.iconBtn}
                >
                  <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        )}
        ListEmptyComponent={<Text style={styles.empty}>カテゴリがありません</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemName: { fontSize: 15, color: COLORS.text, fontWeight: '600' },
  itemSub: { fontSize: 12, color: COLORS.textSub, marginTop: 2 },
  iconBtn: { padding: 4 },
  empty: { textAlign: 'center', color: COLORS.textMuted, marginTop: SPACING.xl },
});

export default CategoryManageScreen;

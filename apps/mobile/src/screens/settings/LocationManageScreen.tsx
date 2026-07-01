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
  createLocation,
  deleteLocation,
  fetchLocations,
  updateLocation,
  type Location,
} from '../../api/master';
import { invalidateAssetRelated } from '../../lib/invalidate';

const LocationManageScreen: React.FC = () => {
  const qc = useQueryClient();
  const { data, refetch, isLoading } = useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocations,
  });

  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Location | null>(null);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const input = { name: name.trim(), parentId };
      if (editing) return updateLocation(editing.id, input);
      return createLocation(input);
    },
    onSuccess: () => {
      setName('');
      setParentId(null);
      setEditing(null);
      qc.invalidateQueries({ queryKey: ['locations'] });
    },
    onError: (e: any) => Alert.alert('エラー', e?.response?.data?.message ?? String(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteLocation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] });
      // 削除で資産側の locationId が外れるため、資産系キャッシュも更新
      invalidateAssetRelated(qc);
    },
    onError: (e: any) => Alert.alert('削除失敗', e?.response?.data?.message ?? String(e)),
  });

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert('入力エラー', '設置場所名を入力してください');
      return;
    }
    submitMutation.mutate();
  };

  const startEdit = (l: Location) => {
    setEditing(l);
    setName(l.name);
    setParentId(l.parentId);
  };

  // 親候補（自分とその子孫を除く）
  const locations = data ?? [];
  const parentOptions = locations
    .filter((l) => !editing || l.id !== editing.id)
    .map((l) => ({ value: l.id, label: l.name }));

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg, padding: SPACING.lg }}>
      <Card>
        <TextField
          label={editing ? '編集' : '新規追加'}
          value={name}
          onChangeText={setName}
          placeholder="例: 書斎、外壁"
        />
        <ChipSelector
          label="親（任意・階層化用）"
          options={parentOptions}
          value={parentId}
          onChange={setParentId}
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
                  setParentId(null);
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
        data={locations}
        keyExtractor={(l) => l.id}
        refreshing={isLoading}
        onRefresh={() => refetch()}
        renderItem={({ item }) => {
          const parent = item.parentId ? locations.find((l) => l.id === item.parentId) : null;
          return (
            <Card>
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {parent ? <Text style={styles.itemSub}>親: {parent.name}</Text> : null}
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
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>設置場所がありません</Text>}
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

export default LocationManageScreen;

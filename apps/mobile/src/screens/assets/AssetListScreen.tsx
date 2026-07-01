import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { fetchAssets, type AssetSummary } from '../../api/assets';
import { fetchCategories, fetchLocations } from '../../api/master';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { ChipSelector } from '../../components/ChipSelector';
import { StatusBadge } from '../../components/StatusBadge';
import { AssetTypeBadge } from '../../components/AssetTypeBadge';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { daysUntil } from '../../lib/dateUtils';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../theme';
import {
  ASSET_STATUSES,
  ASSET_STATUS_LABELS,
  ASSET_TYPES,
  ASSET_TYPE_LABELS,
} from '@homeasset/shared';
import type { AssetsStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AssetsStackParamList, 'AssetList'>;

const SORT_OPTIONS = [
  { value: 'updated_desc', label: '更新が新しい順' },
  { value: 'name_asc', label: '名称順' },
  { value: 'warranty_asc', label: '保証期限が近い順' },
  { value: 'purchase_desc', label: '購入が新しい順' },
  { value: 'created_desc', label: '登録が新しい順' },
];

const AssetListScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [search, setSearch] = useState('');
  const [assetType, setAssetType] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [sort, setSort] = useState<string>('updated_desc');
  const [filterOpen, setFilterOpen] = useState(false);

  const activeFilterCount =
    (assetType ? 1 : 0) + (categoryId ? 1 : 0) + (locationId ? 1 : 0) + (status ? 1 : 0);

  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });
  const locationsQuery = useQuery({ queryKey: ['locations'], queryFn: fetchLocations });

  // 検索はデバウンスし、キーストロークごとのリクエストを間引く
  const debouncedSearch = useDebouncedValue(search, 300);

  const assetsQuery = useQuery({
    queryKey: ['assets', debouncedSearch, assetType, categoryId, locationId, status, sort],
    queryFn: () =>
      fetchAssets({
        search: debouncedSearch || undefined,
        assetType: (assetType as any) || undefined,
        categoryId: categoryId || undefined,
        locationId: locationId || undefined,
        status: (status as any) || undefined,
        sort: sort as any,
      }),
  });

  const clearAllFilters = () => {
    setSearch('');
    setAssetType(null);
    setCategoryId(null);
    setLocationId(null);
    setStatus(null);
  };

  const assetTypeOptions = ASSET_TYPES.map((t) => ({ value: t, label: ASSET_TYPE_LABELS[t] }));
  const categoryOptions = useMemo(
    () => (categoriesQuery.data ?? []).map((c) => ({ value: c.id, label: c.name })),
    [categoriesQuery.data]
  );
  const locationOptions = useMemo(
    () => (locationsQuery.data ?? []).map((l) => ({ value: l.id, label: l.name })),
    [locationsQuery.data]
  );
  const statusOptions = ASSET_STATUSES.map((s) => ({ value: s, label: ASSET_STATUS_LABELS[s] }));

  // 適用中フィルタのチップ（パネルを閉じていても何で絞っているか見える＋個別解除）
  const appliedFilters: { key: string; label: string; clear: () => void }[] = [];
  if (assetType) {
    appliedFilters.push({
      key: 'assetType',
      label: ASSET_TYPE_LABELS[assetType as keyof typeof ASSET_TYPE_LABELS] ?? assetType,
      clear: () => setAssetType(null),
    });
  }
  if (categoryId) {
    appliedFilters.push({
      key: 'category',
      label: categoryOptions.find((o) => o.value === categoryId)?.label ?? 'カテゴリ',
      clear: () => setCategoryId(null),
    });
  }
  if (locationId) {
    appliedFilters.push({
      key: 'location',
      label: locationOptions.find((o) => o.value === locationId)?.label ?? '設置場所',
      clear: () => setLocationId(null),
    });
  }
  if (status) {
    appliedFilters.push({
      key: 'status',
      label: ASSET_STATUS_LABELS[status as keyof typeof ASSET_STATUS_LABELS] ?? status,
      clear: () => setStatus(null),
    });
  }

  const renderWarranty = (item: AssetSummary) => {
    if (!item.warrantyEndDate) return null;
    const days = daysUntil(item.warrantyEndDate);
    if (days < 0) {
      return <Text style={[styles.meta, { color: COLORS.danger }]}>保証期限切れ（{item.warrantyEndDate}）</Text>;
    }
    if (days <= 30) {
      return <Text style={[styles.meta, { color: COLORS.warning }]}>保証期限まで{days}日（{item.warrantyEndDate}）</Text>;
    }
    return <Text style={styles.meta}>保証期限: {item.warrantyEndDate}</Text>;
  };

  const renderItem = ({ item }: { item: AssetSummary }) => (
    <TouchableOpacity onPress={() => navigation.navigate('AssetDetail', { assetId: item.id })}>
      <Card style={{ borderLeftWidth: 3, borderLeftColor: COLORS.assetType[item.assetType] ?? COLORS.border }}>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            <View style={styles.badgeRow}>
              <AssetTypeBadge assetType={item.assetType} />
              <View style={{ width: 4 }} />
              <StatusBadge status={item.status} />
            </View>
            <Text style={styles.meta}>
              {item.category?.name ?? '未分類'} / {item.location?.name ?? '場所未設定'}
            </Text>
            <Text style={styles.meta}>
              {[item.manufacturer, item.modelNumber].filter(Boolean).join(' / ') ||
                '型番情報なし'}
            </Text>
            {renderWarranty(item)}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  const isFiltered = activeFilterCount > 0 || !!debouncedSearch;

  // 0件時: フィルタ起因なら解除導線、純粋に未登録なら初回ガイド
  const renderEmpty = () => {
    if (isFiltered) {
      return (
        <View style={styles.emptyWrap}>
          <Ionicons name="filter" size={32} color={COLORS.textMuted} />
          <Text style={styles.empty}>条件に一致する資産がありません</Text>
          <Button title="検索・絞り込みをクリア" variant="outline" onPress={clearAllFilters} />
        </View>
      );
    }
    return (
      <View style={styles.emptyWrap}>
        <Ionicons name="home-outline" size={40} color={COLORS.primaryLight} />
        <Text style={styles.emptyTitle}>最初の資産を登録しましょう</Text>
        <Text style={styles.emptyGuide}>
          家電・住宅設備・家具などを登録すると、保証期限やメンテナンス時期をまとめて管理できます。
        </Text>
        <Button title="資産を追加" onPress={() => navigation.navigate('AssetForm', {})} />
        <View style={{ height: SPACING.sm }} />
        <Button
          title="AI取込でまとめて登録"
          variant="outline"
          onPress={() => (navigation as any).navigate('AiImportTab')}
        />
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={COLORS.textMuted} style={{ marginRight: 6 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="名称・メーカー・型番・施工業者で検索"
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        <TouchableOpacity
          style={styles.filterToggle}
          onPress={() => setFilterOpen((v) => !v)}
          accessibilityLabel={filterOpen ? '絞り込みを閉じる' : '絞り込みを開く'}
        >
          <Ionicons
            name={filterOpen ? 'close' : 'options-outline'}
            size={20}
            color={activeFilterCount > 0 ? COLORS.primary : COLORS.textMuted}
          />
          {activeFilterCount > 0 && !filterOpen ? (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>
      {filterOpen ? (
        <View style={{ paddingHorizontal: SPACING.md }}>
          <ChipSelector
            label="管理対象種別"
            options={assetTypeOptions}
            value={assetType}
            onChange={setAssetType}
            allowClear
          />
          <ChipSelector
            label="カテゴリ"
            options={categoryOptions}
            value={categoryId}
            onChange={setCategoryId}
            allowClear
          />
          <ChipSelector
            label="設置場所"
            options={locationOptions}
            value={locationId}
            onChange={setLocationId}
            allowClear
          />
          <ChipSelector
            label="ステータス"
            options={statusOptions}
            value={status}
            onChange={setStatus}
            allowClear
          />
          <ChipSelector
            label="並び替え"
            options={SORT_OPTIONS}
            value={sort}
            onChange={(v) => v && setSort(v)}
          />
        </View>
      ) : null}

      {!filterOpen && appliedFilters.length > 0 ? (
        <View style={styles.appliedRow}>
          {appliedFilters.map((f) => (
            <TouchableOpacity key={f.key} style={styles.appliedChip} onPress={f.clear} hitSlop={4}>
              <Text style={styles.appliedChipText}>{f.label}</Text>
              <Ionicons name="close" size={14} color={COLORS.primary} />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {assetsQuery.isLoading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.lg }} />
      ) : (
        <FlatList
          data={assetsQuery.data ?? []}
          keyExtractor={(d) => d.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: SPACING.md, paddingBottom: 80 }}
          refreshControl={
            <RefreshControl
              refreshing={assetsQuery.isRefetching}
              onRefresh={() => assetsQuery.refetch()}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={renderEmpty()}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AssetForm', {})}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },
  filterToggle: { marginLeft: 6, padding: 4, position: 'relative' },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  name: { ...TYPOGRAPHY.sectionTitle, color: COLORS.text },
  badgeRow: { flexDirection: 'row', marginTop: 4, marginBottom: 2 },
  meta: { fontSize: 12, color: COLORS.textSub, marginTop: 2 },
  empty: { textAlign: 'center', color: COLORS.textMuted, marginVertical: SPACING.lg },
  emptyWrap: { alignItems: 'center', marginTop: SPACING.xxl, paddingHorizontal: SPACING.xl },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptyGuide: {
    fontSize: 13,
    color: COLORS.textSub,
    textAlign: 'center',
    marginVertical: SPACING.md,
    lineHeight: 19,
  },
  appliedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  appliedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 999,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    gap: 4,
  },
  appliedChipText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default AssetListScreen;

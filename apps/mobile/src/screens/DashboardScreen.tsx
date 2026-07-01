import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchDashboard, type DashboardAssetSummary } from '../api/dashboard';
import { fetchActionPlans } from '../api/actionPlans';
import type { ActionPlan } from '../api/assets';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { AssetTypeBadge } from '../components/AssetTypeBadge';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../theme';

const STORAGE_KEY = 'dashboard.collapsed';
const ALL_SECTION_IDS = [
  'broken',
  'warrantySoon',
  'maintSoon',
  'replacePlanned',
  'selfCare',
  'estimate',
  'nearTerm',
  'warrantyExpired',
  'incomplete',
  'recent',
] as const;

// action_phase の分類値
const PHASE_SELF = 'セルフ点検・清掃';
const PHASE_ESTIMATE = '見積候補';

// 更新予定の年レンジ＋ステータスを文字列化
const formatYearWindow = (p: ActionPlan): string => {
  const parts: string[] = [];
  if (p.replacementYearFrom != null && p.replacementYearTo != null) {
    parts.push(
      p.replacementYearFrom === p.replacementYearTo
        ? `${p.replacementYearFrom}年`
        : `${p.replacementYearFrom}〜${p.replacementYearTo}年`
    );
  } else if (p.replacementYearFrom != null) {
    parts.push(`${p.replacementYearFrom}年〜`);
  }
  if (p.replacementStatus) parts.push(p.replacementStatus);
  return parts.join('・') || '—';
};

const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
  });

  const { data: actionPlans } = useQuery({
    queryKey: ['action-plans'],
    queryFn: fetchActionPlans,
  });

  const cutoffYear = new Date().getFullYear() + 2;

  // 今年〜2年先までに更新予定の資産（更新時期が近い順）
  const nearTermPlans = useMemo(() => {
    return (actionPlans ?? [])
      .filter((p) => p.replacementYearFrom != null && p.replacementYearFrom <= cutoffYear)
      .sort((a, b) => (a.replacementYearFrom ?? 9999) - (b.replacementYearFrom ?? 9999));
  }, [actionPlans, cutoffYear]);

  // 自前で点検・清掃すべき機器（action_phase 別）
  const selfCarePlans = useMemo(
    () => (actionPlans ?? []).filter((p) => p.actionPhase === PHASE_SELF),
    [actionPlans]
  );
  // 業者の点検・見積を検討すべき機器
  const estimatePlans = useMemo(
    () => (actionPlans ?? []).filter((p) => p.actionPhase === PHASE_ESTIMATE),
    [actionPlans]
  );

  // セクションの折りたたみ状態（AsyncStorageに保存して次回も維持）
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v) setCollapsed(JSON.parse(v));
      })
      .catch(() => {});
  }, []);

  const persist = (next: Record<string, boolean>) => {
    setCollapsed(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  };
  // 明示設定があれば優先。無ければ「空セクション(0件)は初期状態で畳む」。
  const isCollapsed = (id: string, count: number) =>
    id in collapsed ? collapsed[id] : count === 0;
  const toggle = (id: string, count: number) =>
    persist({ ...collapsed, [id]: !isCollapsed(id, count) });
  const collapseAll = () =>
    persist(Object.fromEntries(ALL_SECTION_IDS.map((id) => [id, true])));
  const expandAll = () =>
    persist(Object.fromEntries(ALL_SECTION_IDS.map((id) => [id, false])));
  const sectionProps = (id: string, count: number) => ({
    collapsed: isCollapsed(id, count),
    onToggle: () => toggle(id, count),
  });

  const goAsset = useCallback(
    (id: string) => {
      navigation.navigate('AssetsTab', { screen: 'AssetDetail', params: { assetId: id } });
    },
    [navigation]
  );

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  const broken = data?.brokenAssets ?? [];
  const warrantySoon = data?.warrantyExpiringSoonAssets ?? [];
  const maintSoon = data?.upcomingMaintenanceAssets ?? [];
  const replacePlanned = data?.replacementPlannedAssets ?? [];
  const warrantyExpired = data?.warrantyExpiredAssets ?? [];
  const incomplete = data?.incompleteAssets ?? [];
  const recent = data?.recentAssets ?? [];

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => refetch()}
          tintColor={COLORS.primary}
        />
      }
    >
      <Card>
        <View style={styles.totalRow}>
          <View>
            <Text style={styles.totalLabel}>登録資産数</Text>
            <Text style={styles.totalValue}>{data?.assetCount ?? 0}</Text>
          </View>
          <TouchableOpacity
            style={styles.quickAdd}
            onPress={() => navigation.navigate('AssetsTab', { screen: 'AssetForm', params: {} })}
          >
            <Ionicons name="add-circle" size={20} color={COLORS.primary} />
            <Text style={styles.quickAddText}>資産を追加</Text>
          </TouchableOpacity>
        </View>
        {/* 要対応サマリー: タップで該当セクションを展開 */}
        <View style={styles.summaryRow}>
          <SummaryChip
            icon="build"
            color={COLORS.danger}
            label="修理・故障"
            count={broken.length}
            onPress={() => persist({ ...collapsed, broken: false })}
          />
          <SummaryChip
            icon="warning"
            color={COLORS.warning}
            label="保証間近"
            count={warrantySoon.length}
            onPress={() => persist({ ...collapsed, warrantySoon: false })}
          />
          <SummaryChip
            icon="construct"
            color={COLORS.accent}
            label="メンテ予定"
            count={maintSoon.length}
            onPress={() => persist({ ...collapsed, maintSoon: false })}
          />
        </View>
      </Card>

      <View style={styles.toggleAllRow}>
        <TouchableOpacity onPress={expandAll} style={styles.toggleAllBtn}>
          <Ionicons name="chevron-down" size={14} color={COLORS.primary} />
          <Text style={styles.toggleAllText}>すべて展開</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={collapseAll} style={styles.toggleAllBtn}>
          <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
          <Text style={styles.toggleAllText}>すべて折りたたむ</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.groupLabel}>要対応</Text>
      <AssetSection
        id="broken"
        icon="build"
        iconColor={COLORS.danger}
        title="修理中・故障中"
        emptyText="修理中・故障中の資産はありません"
        assets={broken}
        onPress={goAsset}
        {...sectionProps('broken', broken.length)}
      />
      <AssetSection
        id="warrantySoon"
        icon="warning"
        iconColor={COLORS.warning}
        title="保証期限が近い（30日以内）"
        emptyText="該当資産はありません"
        assets={warrantySoon}
        onPress={goAsset}
        {...sectionProps('warrantySoon', warrantySoon.length)}
      />
      <AssetSection
        id="maintSoon"
        icon="construct"
        iconColor={COLORS.accent}
        title="メンテナンス予定が近い"
        emptyText="予定はありません"
        assets={maintSoon}
        onPress={goAsset}
        showNext
        {...sectionProps('maintSoon', maintSoon.length)}
      />

      <Text style={styles.groupLabel}>計画</Text>
      <AssetSection
        id="replacePlanned"
        icon="swap-horizontal"
        iconColor={COLORS.badge.replacement_planned}
        title="交換予定の資産"
        emptyText="交換予定はありません"
        assets={replacePlanned}
        onPress={goAsset}
        {...sectionProps('replacePlanned', replacePlanned.length)}
      />

      <CollapsibleSection
        icon="search"
        iconColor={COLORS.primary}
        title="自前で点検・清掃"
        count={selfCarePlans.length}
        {...sectionProps('selfCare', selfCarePlans.length)}
      >
        <PlanCards
          plans={selfCarePlans}
          emptyText="該当はありません"
          onPress={goAsset}
          lines={(p) => [p.nextAction ?? p.managementPolicy]}
        />
      </CollapsibleSection>

      <CollapsibleSection
        icon="briefcase"
        iconColor={COLORS.assetType.housing_equipment}
        title="業者の点検・見積を検討"
        count={estimatePlans.length}
        {...sectionProps('estimate', estimatePlans.length)}
      >
        <PlanCards
          plans={estimatePlans}
          emptyText="該当はありません"
          onPress={goAsset}
          lines={(p) => [p.estimateTiming ? `見積: ${p.estimateTiming}` : p.nextAction]}
        />
      </CollapsibleSection>

      <CollapsibleSection
        icon="refresh"
        iconColor={COLORS.badge.replaced}
        title={`更新時期が近い（〜${cutoffYear}年）`}
        count={nearTermPlans.length}
        {...sectionProps('nearTerm', nearTermPlans.length)}
      >
        <PlanCards
          plans={nearTermPlans}
          emptyText="該当はありません"
          onPress={goAsset}
          lines={(p) => [`更新予定: ${formatYearWindow(p)}`, p.nextAction ? `次: ${p.nextAction}` : null]}
        />
      </CollapsibleSection>

      <Text style={styles.groupLabel}>その他</Text>
      <AssetSection
        id="warrantyExpired"
        icon="close-circle"
        iconColor={COLORS.danger}
        title="保証期限切れ"
        emptyText="期限切れの資産はありません"
        assets={warrantyExpired}
        onPress={goAsset}
        {...sectionProps('warrantyExpired', warrantyExpired.length)}
      />
      <AssetSection
        id="incomplete"
        icon="information-circle"
        iconColor={COLORS.textMuted}
        title="情報不足の資産"
        emptyText="情報不足の資産はありません"
        assets={incomplete}
        onPress={goAsset}
        {...sectionProps('incomplete', incomplete.length)}
      />
      <AssetSection
        id="recent"
        icon="time"
        iconColor={COLORS.success}
        title="最近更新した資産"
        emptyText="まだ資産が登録されていません"
        assets={recent}
        onPress={goAsset}
        {...sectionProps('recent', recent.length)}
      />
    </ScrollView>
  );
};

// 要対応サマリーのチップ（件数0はグレー表示・タップで該当セクション展開）
const SummaryChip: React.FC<{
  icon: any;
  color: string;
  label: string;
  count: number;
  onPress: () => void;
}> = ({ icon, color, label, count, onPress }) => {
  const active = count > 0;
  const tint = active ? color : COLORS.textMuted;
  return (
    <TouchableOpacity style={[styles.summaryChip, active && { borderColor: tint }]} onPress={onPress} hitSlop={4}>
      <Ionicons name={icon} size={14} color={tint} />
      <Text style={[styles.summaryChipLabel, { color: tint }]}>{label}</Text>
      <Text style={[styles.summaryChipCount, { color: tint }]}>{count}</Text>
    </TouchableOpacity>
  );
};

// 折りたたみ可能なセクション枠（見出しタップで開閉・件数バッジ表示）
const CollapsibleSection: React.FC<{
  title: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  icon?: any;
  iconColor?: string;
  children: React.ReactNode;
}> = ({ title, count, collapsed, onToggle, icon, iconColor, children }) => (
  <View style={{ marginBottom: SPACING.md }}>
    <TouchableOpacity onPress={onToggle} style={styles.sectionHeader} activeOpacity={0.6}>
      <Ionicons
        name={collapsed ? 'chevron-forward' : 'chevron-down'}
        size={18}
        color={COLORS.textSub}
      />
      {icon ? (
        <Ionicons name={icon} size={16} color={iconColor ?? COLORS.textSub} style={{ marginLeft: 2 }} />
      ) : null}
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.countBadge}>
        <Text style={styles.countText}>{count}</Text>
      </View>
    </TouchableOpacity>
    {collapsed ? null : children}
  </View>
);

// アクション計画ベースのカード一覧（種別セクション用）
const PlanCards: React.FC<{
  plans: ActionPlan[];
  emptyText: string;
  lines: (p: ActionPlan) => (string | null | undefined)[];
  onPress: (id: string) => void;
}> = ({ plans, emptyText, lines, onPress }) => {
  if (plans.length === 0) {
    return (
      <Card>
        <Text style={styles.empty}>{emptyText}</Text>
      </Card>
    );
  }
  return (
    <>
      {plans.map((p) => {
        const ls = lines(p).filter(Boolean) as string[];
        return (
          <TouchableOpacity key={p.id} onPress={() => p.asset && onPress(p.asset.id)}>
            <Card
              style={{
                borderLeftWidth: 3,
                borderLeftColor:
                  (p.asset && COLORS.assetType[p.asset.assetType]) || COLORS.border,
              }}
            >
              <Text style={styles.assetName}>{p.asset?.name ?? '—'}</Text>
              {ls.map((l, i) => (
                <Text key={i} style={styles.assetMeta} numberOfLines={2}>
                  {l}
                </Text>
              ))}
            </Card>
          </TouchableOpacity>
        );
      })}
    </>
  );
};

const AssetSection: React.FC<{
  id: string;
  title: string;
  emptyText: string;
  assets: DashboardAssetSummary[];
  onPress: (id: string) => void;
  showNext?: boolean;
  collapsed: boolean;
  onToggle: () => void;
  icon?: any;
  iconColor?: string;
}> = ({ title, emptyText, assets, onPress, showNext, collapsed, onToggle, icon, iconColor }) => (
  <CollapsibleSection
    title={title}
    count={assets.length}
    collapsed={collapsed}
    onToggle={onToggle}
    icon={icon}
    iconColor={iconColor}
  >
    {assets.length === 0 ? (
      <Card>
        <Text style={styles.empty}>{emptyText}</Text>
      </Card>
    ) : (
      assets.map((d) => (
        <TouchableOpacity
          key={d.id + (showNext ? '_' + d.nextMaintenanceDate : '')}
          onPress={() => onPress(d.id)}
        >
          <Card
            style={{
              borderLeftWidth: 3,
              borderLeftColor: COLORS.assetType[d.assetType] ?? COLORS.border,
            }}
          >
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.assetName}>{d.name}</Text>
                <View style={styles.badgeRow}>
                  <AssetTypeBadge assetType={d.assetType} />
                  <View style={{ width: 4 }} />
                  <StatusBadge status={d.status} />
                </View>
                <Text style={styles.assetMeta}>
                  {d.categoryName ?? '未分類'} / {d.locationName ?? '場所未設定'}
                </Text>
                {d.warrantyEndDate ? (
                  <Text style={styles.assetMeta}>保証期限: {d.warrantyEndDate}</Text>
                ) : null}
                {showNext && d.nextMaintenanceDate ? (
                  <Text style={styles.assetMeta}>次回予定: {d.nextMaintenanceDate}</Text>
                ) : null}
              </View>
            </View>
          </Card>
        </TouchableOpacity>
      ))
    )}
  </CollapsibleSection>
);

const styles = StyleSheet.create({
  container: { padding: SPACING.lg, backgroundColor: COLORS.bg },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  totalLabel: { fontSize: 13, color: COLORS.textSub },
  totalValue: { fontSize: 36, fontWeight: '800', color: COLORS.primary, marginTop: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  quickAdd: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.xs },
  quickAddText: { color: COLORS.primary, marginLeft: 4, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.md },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
  },
  summaryChipLabel: { fontSize: 12, fontWeight: '600' },
  summaryChipCount: { fontSize: 13, fontWeight: '800' },
  groupLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
    letterSpacing: 1,
  },
  toggleAllRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  toggleAllBtn: { flexDirection: 'row', alignItems: 'center' },
  toggleAllText: { color: COLORS.primary, fontSize: 12, fontWeight: '600', marginLeft: 2 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  sectionTitle: {
    ...TYPOGRAPHY.sectionTitle,
    color: COLORS.text,
    marginLeft: 4,
    flex: 1,
  },
  countBadge: {
    minWidth: 22,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.border,
    alignItems: 'center',
  },
  countText: { fontSize: 12, fontWeight: '700', color: COLORS.textSub },
  empty: { color: COLORS.textMuted, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  assetName: { ...TYPOGRAPHY.itemTitle, color: COLORS.text },
  badgeRow: { flexDirection: 'row', marginTop: 4 },
  assetMeta: { fontSize: 12, color: COLORS.textSub, marginTop: 2 },
});

export default DashboardScreen;

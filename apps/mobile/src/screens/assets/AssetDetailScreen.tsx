import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

import { deleteAsset, disposeAsset, fetchAsset, replaceAsset } from '../../api/assets';
import {
  deleteSpec,
  deleteLink,
  deleteMaintenance,
  deleteRepair,
  deleteConsumable,
  deleteAccessory,
} from '../../api/children';
import { Card } from '../../components/Card';
import { Section } from '../../components/Section';
import { InfoRow } from '../../components/InfoRow';
import { StatusBadge } from '../../components/StatusBadge';
import { AssetTypeBadge } from '../../components/AssetTypeBadge';
import { useToast } from '../../components/Toast';
import { invalidateAssetRelated } from '../../lib/invalidate';
import { confirmDestructive } from '../../lib/confirm';
import { daysUntil } from '../../lib/dateUtils';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../theme';
import {
  LINK_TYPE_LABELS,
  MAINTENANCE_TYPE_LABELS,
  REPAIR_STATUS_LABELS,
  CONNECTION_TYPE_LABELS,
} from '@homeasset/shared';
import type { AssetsStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AssetsStackParamList, 'AssetDetail'>;
type Rt = RouteProp<AssetsStackParamList, 'AssetDetail'>;

const AssetDetailScreen: React.FC = () => {
  const route = useRoute<Rt>();
  const navigation = useNavigation<Nav>();
  const qc = useQueryClient();
  const toast = useToast();
  const { assetId } = route.params;

  const query = useQuery({ queryKey: ['asset', assetId], queryFn: () => fetchAsset(assetId) });
  const d = query.data;

  const invalidate = () => invalidateAssetRelated(qc, assetId);

  const disposeMutation = useMutation({
    mutationFn: () => disposeAsset(assetId),
    onSuccess: () => {
      invalidate();
      toast.show('廃棄済みに変更しました');
    },
    onError: (e: any) => Alert.alert('エラー', e?.response?.data?.message ?? String(e)),
  });

  const replaceMutation = useMutation({
    mutationFn: () => replaceAsset(assetId),
    onSuccess: () => {
      invalidate();
      toast.show('交換済みに変更しました');
    },
    onError: (e: any) => Alert.alert('エラー', e?.response?.data?.message ?? String(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAsset(assetId),
    onSuccess: () => {
      invalidate();
      navigation.goBack();
    },
    onError: (e: any) => Alert.alert('エラー', e?.response?.data?.message ?? String(e)),
  });

  const childDeleteMutation = useMutation({
    mutationFn: async (op: {
      kind: 'spec' | 'link' | 'maintenance' | 'repair' | 'consumable' | 'accessory';
      id: string;
    }) => {
      switch (op.kind) {
        case 'spec':
          return deleteSpec(op.id);
        case 'link':
          return deleteLink(op.id);
        case 'maintenance':
          return deleteMaintenance(op.id);
        case 'repair':
          return deleteRepair(op.id);
        case 'consumable':
          return deleteConsumable(op.id);
        case 'accessory':
          return deleteAccessory(op.id);
      }
    },
    onSuccess: () => {
      invalidate();
      toast.show('削除しました');
    },
    onError: (e: any) => Alert.alert('エラー', e?.response?.data?.message ?? String(e)),
  });

  // 子項目（スペック/リンク/履歴など）の削除は必ず確認を挟む
  const confirmChildDelete = (
    kind: 'spec' | 'link' | 'maintenance' | 'repair' | 'consumable' | 'accessory',
    id: string,
    name: string
  ) =>
    confirmDestructive({
      title: '削除確認',
      message: `${name} を削除しますか？`,
      onConfirm: () => childDeleteMutation.mutate({ kind, id }),
    });

  const confirmDispose = () =>
    confirmDestructive({
      title: '廃棄済みに変更',
      message: 'この資産を廃棄済みに変更します。よろしいですか？',
      confirmLabel: '廃棄済みにする',
      onConfirm: () => disposeMutation.mutate(),
    });

  const confirmReplace = () =>
    confirmDestructive({
      title: '交換済みに変更',
      message: 'この資産を交換済みに変更します。よろしいですか？',
      confirmLabel: '交換済みにする',
      onConfirm: () => replaceMutation.mutate(),
    });

  const confirmDelete = () =>
    confirmDestructive({
      title: '完全削除',
      message: 'この資産を物理削除します（履歴も含めて消えます）。よろしいですか？',
      onConfirm: () => deleteMutation.mutate(),
    });

  if (query.isLoading || !d) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: COLORS.bg,
        }}
      >
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  const openUrl = (url?: string | null) => {
    if (!url) return;
    Linking.openURL(url).catch(() => Alert.alert('エラー', 'URLを開けませんでした'));
  };

  // 値をクリップボードへコピー（空値は無視）してトースト通知
  const copyText = (value?: string | null, label = '値') => {
    if (!value) return;
    Clipboard.setStringAsync(String(value));
    toast.show(`${label}をコピーしました`);
  };

  // メーカー・型番・機器名で既定ブラウザの Google 検索を開く
  const webSearch = () => {
    const q = [d.manufacturer, d.modelNumber, d.name].filter(Boolean).join(' ');
    if (!q) return;
    openUrl(`https://www.google.com/search?q=${encodeURIComponent(q)}`);
  };

  // 保証期限警告（タイムゾーンずれ防止のため daysUntil で計算）
  let warrantyWarning: string | null = null;
  if (d.warrantyEndDate) {
    const diffDays = daysUntil(d.warrantyEndDate);
    if (diffDays < 0) warrantyWarning = '保証期限切れ';
    else if (diffDays <= 30) warrantyWarning = `保証期限まで残り${diffDays}日`;
  }

  // 各情報セクションに値があるか（無ければ「未入力」を1行表示）
  const purchaseHasAny = [
    d.purchaseDate, d.installedDate, d.constructionDate, d.purchaseStore,
    d.contractorName, d.contractorContact, d.contactPerson, d.purchasePrice,
    d.constructionCost, d.orderNumber, d.contractNumber, d.purchaseUrl,
    d.receiptUrl, d.constructionDocumentUrl,
  ].some((v) => v != null && v !== '');
  const warrantyHasAny =
    !!d.warrantyStartDate || !!d.warrantyEndDate || d.hasExtendedWarranty || !!d.warrantyMemo;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={query.isRefetching}
          onRefresh={() => query.refetch()}
          tintColor={COLORS.primary}
        />
      }
    >
      <Card>
        <View style={styles.headerRow}>
          <Text style={styles.name} selectable>
            {d.name}
          </Text>
          <TouchableOpacity onPress={() => copyText(d.name, '機器名')} hitSlop={8}>
            <Ionicons name="copy-outline" size={20} color={COLORS.textSub} />
          </TouchableOpacity>
        </View>
        <View style={styles.badgeRow}>
          <AssetTypeBadge assetType={d.assetType} />
          <View style={{ width: 6 }} />
          <StatusBadge status={d.status} />
        </View>
        <Text style={styles.meta}>
          {d.category?.name ?? '未分類'} / {d.location?.name ?? '場所未設定'}
        </Text>
        {warrantyWarning ? (
          <View style={styles.warningBanner}>
            <Ionicons name="warning" size={16} color="#fff" />
            <Text style={styles.warningText}>{warrantyWarning}</Text>
          </View>
        ) : null}
        <View style={styles.actionsRow}>
          <ActionButton
            icon="create"
            label="編集"
            onPress={() => navigation.navigate('AssetForm', { assetId })}
          />
          <ActionButton
            icon="sparkles"
            label="AI取込"
            onPress={() => navigation.navigate('AiImportFromAsset', { assetId })}
          />
          <ActionButton icon="search" label="検索" onPress={webSearch} />
          <ActionButton icon="swap-horizontal" label="交換済" onPress={confirmReplace} />
          <ActionButton icon="trash" label="廃棄" onPress={confirmDispose} />
        </View>
      </Card>

      <Section title="基本情報">
        <Card>
          <InfoRow label="メーカー" value={d.manufacturer} hideEmpty copyable />
          <InfoRow label="型番" value={d.modelNumber} hideEmpty copyable />
          <InfoRow label="シリアル番号" value={d.serialNumber} hideEmpty copyable />
          <InfoRow label="優先度" value={d.priority} />
        </Card>
      </Section>

      <Section title="購入・設置・施工情報">
        <Card>
          {!purchaseHasAny ? <Text style={styles.empty}>未入力</Text> : null}
          <InfoRow label="購入日" value={d.purchaseDate} hideEmpty />
          <InfoRow label="設置日" value={d.installedDate} hideEmpty />
          <InfoRow label="施工日" value={d.constructionDate} hideEmpty />
          <InfoRow label="購入店舗" value={d.purchaseStore} hideEmpty />
          <InfoRow label="施工業者" value={d.contractorName} hideEmpty />
          <InfoRow label="業者連絡先" value={d.contractorContact} hideEmpty />
          <InfoRow label="担当者" value={d.contactPerson} hideEmpty />
          <InfoRow
            label="購入価格"
            value={d.purchasePrice != null ? `¥${d.purchasePrice.toLocaleString()}` : null}
            hideEmpty
          />
          <InfoRow
            label="施工費用"
            value={d.constructionCost != null ? `¥${d.constructionCost.toLocaleString()}` : null}
            hideEmpty
          />
          <InfoRow label="注文番号" value={d.orderNumber} hideEmpty />
          <InfoRow label="契約番号" value={d.contractNumber} hideEmpty />
          {d.purchaseUrl ? (
            <TouchableOpacity onPress={() => openUrl(d.purchaseUrl)}>
              <Text style={styles.linkText}>購入ページを開く</Text>
            </TouchableOpacity>
          ) : null}
          {d.receiptUrl ? (
            <TouchableOpacity onPress={() => openUrl(d.receiptUrl)}>
              <Text style={styles.linkText}>レシート・領収書を開く</Text>
            </TouchableOpacity>
          ) : null}
          {d.constructionDocumentUrl ? (
            <TouchableOpacity onPress={() => openUrl(d.constructionDocumentUrl)}>
              <Text style={styles.linkText}>施工資料を開く</Text>
            </TouchableOpacity>
          ) : null}
        </Card>
      </Section>

      <Section title="保証情報">
        <Card>
          {warrantyHasAny ? (
            <>
              <InfoRow label="保証開始日" value={d.warrantyStartDate} hideEmpty />
              <InfoRow label="保証終了日" value={d.warrantyEndDate} hideEmpty />
              <InfoRow label="延長保証" value={d.hasExtendedWarranty ? 'あり' : 'なし'} />
              <InfoRow label="保証メモ" value={d.warrantyMemo} hideEmpty />
            </>
          ) : (
            <Text style={styles.empty}>未入力</Text>
          )}
        </Card>
      </Section>

      <Section
        title="メンテ計画"
        action={
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <SmallAddButton
              label="AIで作成"
              onPress={() => navigation.navigate('AiActionPlanForm', { assetId })}
            />
            <SmallAddButton
              label={d.actionPlan ? '編集' : '追加'}
              onPress={() => navigation.navigate('ActionPlanForm', { assetId })}
            />
          </View>
        }
      >
        {d.actionPlan ? (
          <Card>
            <PlanText label="方針" value={d.actionPlan.managementPolicy} />
            <InfoRow label="段階" value={d.actionPlan.actionPhase} />
            <PlanText label="次にやること" value={d.actionPlan.nextAction} />
            <PlanText label="業者相談トリガー" value={d.actionPlan.professionalTrigger} />
            <PlanText label="見積タイミング" value={d.actionPlan.estimateTiming} />
            <PlanText label="更新判断" value={d.actionPlan.replacementDecisionTiming} />
            <InfoRow
              label="更新予定"
              value={formatYearWindow(
                d.actionPlan.replacementYearFrom,
                d.actionPlan.replacementYearTo,
                d.actionPlan.replacementStatus
              )}
            />
            <InfoRow
              label="更新費(概算)"
              value={formatCostRange(
                d.actionPlan.replacementCostMin,
                d.actionPlan.replacementCostMax
              )}
            />
            <InfoRow
              label="通常メンテ費"
              value={formatCostRange(d.actionPlan.routineCostMin, d.actionPlan.routineCostMax)}
            />
            <InfoRow
              label="業者費(必要時)"
              value={formatCostRange(
                d.actionPlan.professionalCostMin,
                d.actionPlan.professionalCostMax
              )}
            />
            <InfoRow label="計画の優先度" value={d.actionPlan.priority} />
            {d.actionPlan.notes && d.actionPlan.notes.length > 0 ? (
              <View style={{ marginTop: SPACING.sm }}>
                <Text style={styles.planLabel}>補足</Text>
                {d.actionPlan.notes.map((n, i) => (
                  <Text key={i} style={styles.planBody}>
                    ・{n}
                  </Text>
                ))}
              </View>
            ) : null}
            {d.actionPlan.generatedAt ? (
              <Text style={[styles.itemMemo, { marginTop: SPACING.sm }]}>
                AI生成: {d.actionPlan.generatedAt.slice(0, 10)}
                {d.actionPlan.source ? `（${d.actionPlan.source}）` : ''}
              </Text>
            ) : null}
          </Card>
        ) : (
          <Card>
            <Text style={styles.empty}>メンテ計画はまだ登録されていません</Text>
          </Card>
        )}
      </Section>

      <Section
        title="スペック・仕様"
        collapsible
        defaultCollapsed
        count={d.specs.length}
        action={<SmallAddButton onPress={() => navigation.navigate('SpecForm', { assetId })} />}
      >
        {d.specs.length === 0 ? (
          <Card>
            <Text style={styles.empty}>スペック・仕様情報はまだ登録されていません</Text>
          </Card>
        ) : (
          d.specs.map((s) => (
            <Card key={s.id}>
              <View style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{s.specName}</Text>
                  <Text style={styles.itemValue}>
                    {[s.specValue, s.unit].filter(Boolean).join(' ') || '—'}
                  </Text>
                  {s.memo ? <Text style={styles.itemMemo}>{s.memo}</Text> : null}
                </View>
                <RowActions
                  onEdit={() => navigation.navigate('SpecForm', { assetId, specId: s.id })}
                  onDelete={() => confirmChildDelete('spec', s.id, s.specName)}
                />
              </View>
            </Card>
          ))
        )}
      </Section>

      <Section
        title="関連リンク"
        collapsible
        defaultCollapsed
        count={d.links.length}
        action={<SmallAddButton onPress={() => navigation.navigate('LinkForm', { assetId })} />}
      >
        {d.links.length === 0 ? (
          <Card>
            <Text style={styles.empty}>リンクはまだ登録されていません</Text>
          </Card>
        ) : (
          d.links.map((l) => (
            <Card key={l.id}>
              <View style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>
                    {LINK_TYPE_LABELS[l.linkType as keyof typeof LINK_TYPE_LABELS] ?? l.linkType}
                  </Text>
                  {l.title ? <Text style={styles.itemValue}>{l.title}</Text> : null}
                  <TouchableOpacity onPress={() => openUrl(l.url)}>
                    <Text style={styles.linkText} numberOfLines={2}>
                      {l.url}
                    </Text>
                  </TouchableOpacity>
                  {l.memo ? <Text style={styles.itemMemo}>{l.memo}</Text> : null}
                </View>
                <RowActions
                  onEdit={() => navigation.navigate('LinkForm', { assetId, linkId: l.id })}
                  onDelete={() => confirmChildDelete('link', l.id, l.title || 'このリンク')}
                />
              </View>
            </Card>
          ))
        )}
      </Section>

      <Section
        title="メンテナンス履歴"
        collapsible
        defaultCollapsed
        count={d.maintenanceRecords.length}
        action={
          <SmallAddButton onPress={() => navigation.navigate('MaintenanceForm', { assetId })} />
        }
      >
        {d.maintenanceRecords.length === 0 ? (
          <Card>
            <Text style={styles.empty}>履歴はまだありません</Text>
          </Card>
        ) : (
          d.maintenanceRecords.map((r) => (
            <Card key={r.id}>
              <View style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>
                    {r.maintenanceDate} ・{' '}
                    {MAINTENANCE_TYPE_LABELS[
                      r.maintenanceType as keyof typeof MAINTENANCE_TYPE_LABELS
                    ] ?? r.maintenanceType}
                  </Text>
                  {r.description ? <Text style={styles.itemValue}>{r.description}</Text> : null}
                  {r.vendorName ? (
                    <Text style={styles.itemMemo}>業者: {r.vendorName}</Text>
                  ) : null}
                  {r.nextDueDate ? (
                    <Text style={styles.itemMemo}>次回予定: {r.nextDueDate}</Text>
                  ) : null}
                  {r.cost != null ? (
                    <Text style={styles.itemMemo}>費用: ¥{r.cost.toLocaleString()}</Text>
                  ) : null}
                </View>
                <RowActions
                  onEdit={() =>
                    navigation.navigate('MaintenanceForm', { assetId, recordId: r.id })
                  }
                  onDelete={() =>
                    confirmChildDelete('maintenance', r.id, `${r.maintenanceDate} の履歴`)
                  }
                />
              </View>
            </Card>
          ))
        )}
      </Section>

      <Section
        title="修理履歴"
        collapsible
        defaultCollapsed
        count={d.repairRecords.length}
        action={<SmallAddButton onPress={() => navigation.navigate('RepairForm', { assetId })} />}
      >
        {d.repairRecords.length === 0 ? (
          <Card>
            <Text style={styles.empty}>履歴はまだありません</Text>
          </Card>
        ) : (
          d.repairRecords.map((r) => (
            <Card key={r.id}>
              <View style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>
                    {r.occurredDate} ・{' '}
                    {REPAIR_STATUS_LABELS[r.status as keyof typeof REPAIR_STATUS_LABELS] ??
                      r.status}
                  </Text>
                  {r.symptom ? <Text style={styles.itemValue}>症状: {r.symptom}</Text> : null}
                  {r.actionTaken ? (
                    <Text style={styles.itemMemo}>対応: {r.actionTaken}</Text>
                  ) : null}
                  {r.cost != null ? (
                    <Text style={styles.itemMemo}>費用: ¥{r.cost.toLocaleString()}</Text>
                  ) : null}
                </View>
                <RowActions
                  onEdit={() => navigation.navigate('RepairForm', { assetId, recordId: r.id })}
                  onDelete={() => confirmChildDelete('repair', r.id, `${r.occurredDate} の修理履歴`)}
                />
              </View>
            </Card>
          ))
        )}
      </Section>

      <Section
        title="消耗品"
        collapsible
        defaultCollapsed
        count={d.consumables.length}
        action={
          <SmallAddButton onPress={() => navigation.navigate('ConsumableForm', { assetId })} />
        }
      >
        {d.consumables.length === 0 ? (
          <Card>
            <Text style={styles.empty}>消耗品はまだ登録されていません</Text>
          </Card>
        ) : (
          d.consumables.map((c) => (
            <Card key={c.id}>
              <View style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{c.name}</Text>
                  <Text style={styles.itemValue}>
                    {[c.manufacturer, c.modelNumber].filter(Boolean).join(' / ') || '—'}
                  </Text>
                  {c.replacementIntervalText ? (
                    <Text style={styles.itemMemo}>交換目安: {c.replacementIntervalText}</Text>
                  ) : null}
                  {c.nextReplacementDate ? (
                    <Text style={styles.itemMemo}>次回交換: {c.nextReplacementDate}</Text>
                  ) : null}
                </View>
                <RowActions
                  onEdit={() =>
                    navigation.navigate('ConsumableForm', { assetId, consumableId: c.id })
                  }
                  onDelete={() => confirmChildDelete('consumable', c.id, c.name)}
                />
              </View>
            </Card>
          ))
        )}
      </Section>

      <Section
        title="付属品"
        collapsible
        defaultCollapsed
        count={d.accessories.length}
        action={
          <SmallAddButton onPress={() => navigation.navigate('AccessoryForm', { assetId })} />
        }
      >
        {d.accessories.length === 0 ? (
          <Card>
            <Text style={styles.empty}>付属品はまだ登録されていません</Text>
          </Card>
        ) : (
          d.accessories.map((a) => (
            <Card key={a.id}>
              <View style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>
                    {a.name}
                    {a.quantity != null ? ` × ${a.quantity}` : ''}
                  </Text>
                  {a.storageLocation ? (
                    <Text style={styles.itemMemo}>保管場所: {a.storageLocation}</Text>
                  ) : null}
                  {a.memo ? <Text style={styles.itemMemo}>{a.memo}</Text> : null}
                </View>
                <RowActions
                  onEdit={() =>
                    navigation.navigate('AccessoryForm', { assetId, accessoryId: a.id })
                  }
                  onDelete={() => confirmChildDelete('accessory', a.id, a.name)}
                />
              </View>
            </Card>
          ))
        )}
      </Section>

      <Section
        title="ネットワーク情報"
        collapsible
        defaultCollapsed
        count={d.networkInfo ? 1 : 0}
        action={
          <SmallAddButton onPress={() => navigation.navigate('NetworkInfoForm', { assetId })} />
        }
      >
        <Card>
          {d.networkInfo ? (
            <>
              <InfoRow label="IPアドレス" value={d.networkInfo.ipAddress} hideEmpty copyable />
              <InfoRow label="ホスト名" value={d.networkInfo.hostName} hideEmpty copyable />
              <InfoRow label="MACアドレス" value={d.networkInfo.macAddress} hideEmpty copyable />
              <InfoRow label="管理URL" value={d.networkInfo.adminUrl} hideEmpty />
              <InfoRow label="ポート" value={d.networkInfo.port} hideEmpty />
              <InfoRow
                label="接続方式"
                value={
                  d.networkInfo.connectionType
                    ? CONNECTION_TYPE_LABELS[
                        d.networkInfo.connectionType as keyof typeof CONNECTION_TYPE_LABELS
                      ] ?? d.networkInfo.connectionType
                    : null
                }
              />
              <InfoRow label="認証情報の保管先" value={d.networkInfo.credentialStorageMemo} hideEmpty />
              <InfoRow label="設定メモ" value={d.networkInfo.settingsMemo} hideEmpty />
            </>
          ) : (
            <Text style={styles.empty}>ネットワーク情報は未登録です</Text>
          )}
        </Card>
      </Section>

      <Section title="メモ">
        <Card>
          <Text style={{ color: COLORS.text }}>{d.memo || '—'}</Text>
        </Card>
      </Section>

      {/* 誤タップ防止のため控えめなテキストリンクにする（確認ダイアログあり） */}
      <TouchableOpacity onPress={confirmDelete} style={styles.dangerLink} hitSlop={8}>
        <Text style={styles.dangerLinkText}>この資産を完全削除（誤登録用）</Text>
      </TouchableOpacity>
      <View style={{ height: SPACING.xxl }} />
    </ScrollView>
  );
};

// 金額レンジを「¥80,000〜¥250,000」表記に
const formatCostRange = (min: number | null, max: number | null): string | null => {
  if (min == null && max == null) return null;
  const f = (n: number) => `¥${n.toLocaleString()}`;
  if (min != null && max != null) return min === max ? f(min) : `${f(min)}〜${f(max)}`;
  return f((min ?? max) as number);
};

// 更新予定の年レンジ＋ステータスを「2036〜2042年（当面はセルフ管理）」表記に
const formatYearWindow = (
  from: number | null,
  to: number | null,
  status: string | null
): string | null => {
  let base: string | null = null;
  if (from != null && to != null) base = from === to ? `${from}年` : `${from}〜${to}年`;
  else if (from != null) base = `${from}年〜`;
  else if (to != null) base = `〜${to}年`;
  if (base && status) return `${base}（${status}）`;
  return base ?? status ?? null;
};

// 長文項目（切り詰めずラベル＋本文で表示）。値が無ければ非表示。
const PlanText: React.FC<{ label: string; value?: string | null }> = ({ label, value }) =>
  value ? (
    <View style={styles.planTextBlock}>
      <Text style={styles.planLabel}>{label}</Text>
      <Text style={styles.planBody}>{value}</Text>
    </View>
  ) : null;

const SmallAddButton: React.FC<{ onPress: () => void; label?: string }> = ({
  onPress,
  label = '追加',
}) => (
  <TouchableOpacity onPress={onPress} style={styles.smallAdd}>
    <Ionicons name="add" size={16} color="#fff" />
    <Text style={styles.smallAddText}>{label}</Text>
  </TouchableOpacity>
);

const ActionButton: React.FC<{ icon: any; label: string; onPress: () => void }> = ({
  icon,
  label,
  onPress,
}) => (
  <TouchableOpacity onPress={onPress} style={styles.actionBtn}>
    <Ionicons name={icon} size={20} color={COLORS.primary} />
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);

const RowActions: React.FC<{ onEdit: () => void; onDelete: () => void }> = ({
  onEdit,
  onDelete,
}) => (
  <View style={{ flexDirection: 'row', marginLeft: SPACING.sm }}>
    <TouchableOpacity onPress={onEdit} style={styles.iconBtn} hitSlop={8}>
      <Ionicons name="create-outline" size={20} color={COLORS.textSub} />
    </TouchableOpacity>
    <TouchableOpacity onPress={onDelete} style={styles.iconBtn} hitSlop={8}>
      <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: { padding: SPACING.lg, backgroundColor: COLORS.bg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 22, fontWeight: '800', color: COLORS.text, flex: 1, marginRight: SPACING.sm },
  badgeRow: { flexDirection: 'row', marginTop: 6 },
  meta: { fontSize: 13, color: COLORS.textSub, marginTop: 4 },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.sm,
  },
  warningText: { color: '#fff', marginLeft: SPACING.xs, fontWeight: '700' },
  actionsRow: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  actionBtn: { alignItems: 'center', padding: SPACING.sm },
  actionLabel: { color: COLORS.primary, fontSize: 12, marginTop: 2, fontWeight: '600' },
  smallAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  smallAddText: { color: '#fff', marginLeft: 2, fontSize: 12, fontWeight: '700' },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start' },
  itemTitle: { ...TYPOGRAPHY.itemTitle, color: COLORS.text },
  itemValue: { fontSize: 13, color: COLORS.text, marginTop: 2 },
  itemMemo: { fontSize: 12, color: COLORS.textSub, marginTop: 2 },
  planTextBlock: {
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  planLabel: { fontSize: 12, color: COLORS.textSub },
  planBody: { fontSize: 14, color: COLORS.text, marginTop: 2 },
  iconBtn: { padding: 4 },
  empty: { color: COLORS.textMuted, textAlign: 'center', paddingVertical: SPACING.sm },
  dangerLink: { alignItems: 'center', paddingVertical: SPACING.md },
  dangerLinkText: { color: COLORS.danger, fontSize: 13, textDecorationLine: 'underline' },
  linkText: {
    color: COLORS.primary,
    fontSize: 13,
    marginTop: 4,
    textDecorationLine: 'underline',
  },
});

export default AssetDetailScreen;

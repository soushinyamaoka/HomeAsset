import React, { useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Section } from '../../components/Section';
import { fetchAiExport } from '../../api/exportData';
import { COLORS, RADIUS, SPACING } from '../../theme';
import { api } from '../../api/client';

const utf8Length = (value: string) => encodeURIComponent(value).replace(/%[\dA-F]{2}/gi, 'x').length;

const ExportScreen: React.FC = () => {
  const [json, setJson] = useState<string>('');
  const [aiJson, setAiJson] = useState('');
  const [assetCount, setAssetCount] = useState(0);
  const [includeNetwork, setIncludeNetwork] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const onAiExport = async () => {
    setAiLoading(true);
    try {
      const data = await fetchAiExport(includeNetwork);
      setAiJson(JSON.stringify(data, null, 2));
      setAssetCount(data.summary.assetCount);
    } catch (e: any) {
      Alert.alert('エラー', e?.response?.data?.message ?? String(e));
    } finally { setAiLoading(false); }
  };
  const onExport = async () => {
    setBackupLoading(true);
    try {
      const res = await api.get('/api/export/json');
      setJson(JSON.stringify(res.data, null, 2));
    } catch (e: any) {
      Alert.alert('エラー', e?.response?.data?.message ?? String(e));
    } finally { setBackupLoading(false); }
  };
  const onShareFile = async () => {
    if (!aiJson) return;
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('共有できません', 'この端末では共有できません。コピーを使ってください');
        return;
      }
      const date = new Date().toISOString().slice(0, 10);
      const file = new FileSystem.File(FileSystem.Paths.cache, `homeasset-ai-export-${date}.json`);
      file.write(aiJson);
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', ...(Platform.OS === 'android' ? { dialogTitle: 'AI共有用データを共有' } : {}) });
    } catch (e: any) { Alert.alert('エラー', String(e)); }
  };
  const onCopyAi = async () => {
    if (!aiJson) return;
    await Clipboard.setStringAsync(aiJson);
    Alert.alert('コピーしました', 'AI共有用データをクリップボードにコピーしました');
  };
  const onCopyBackup = async () => {
    if (!json) return;
    await Clipboard.setStringAsync(json);
    Alert.alert('コピーしました', 'JSONをクリップボードにコピーしました');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Section title="AIに渡す（整理済みJSON）">
        <Card>
          <Text style={styles.helperText}>他のAIに資産情報を渡して、管理や助言を頼むためのデータです。内部IDなどを除き、項目の説明を付けています。</Text>
          <View style={styles.switchRow}>
            <Text style={[styles.helperText, styles.switchLabel]}>ネットワーク情報（IP・MAC・管理URL）を含める</Text>
            <Switch value={includeNetwork} onValueChange={(value) => { setIncludeNetwork(value); setAiJson(''); setAssetCount(0); }} />
          </View>
          {includeNetwork ? <Text style={styles.warning}>自宅ネットワークの構成が外部AIへ渡ります</Text> : null}
          <Button title="AI共有用データを作成" onPress={onAiExport} loading={aiLoading} />
          {aiJson ? <View style={styles.result}>
            <Text style={styles.helperText}>資産 {assetCount} 件・{(utf8Length(aiJson) / 1024).toFixed(1)} KB</Text>
            <Button title="ファイルで共有" onPress={onShareFile} />
            <View style={styles.gap} />
            <Button title="クリップボードにコピー" onPress={onCopyAi} variant="outline" />
          </View> : null}
        </Card>
      </Section>

      <Section title="バックアップ（全データ）">
        <Card>
          <Text style={styles.helperText}>家庭内の全データ（資産・スペック・施工情報・履歴など）をJSON形式で取得します。コピーして保存することでバックアップになります。</Text>
          <Button title="エクスポート実行" onPress={onExport} loading={backupLoading} />
          {json ? <>
            <View style={styles.gap} />
            <Button title="JSONをコピー" onPress={onCopyBackup} variant="outline" />
            <View style={styles.preview}><Text style={styles.previewText} selectable>{json.length > 5000 ? json.slice(0, 5000) + '\n...(省略)' : json}</Text></View>
          </> : null}
        </Card>
      </Section>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: SPACING.lg, backgroundColor: COLORS.bg },
  helperText: { color: COLORS.textSub, marginBottom: SPACING.md, fontSize: 13, lineHeight: 18 },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  switchLabel: { flex: 1, marginBottom: 0, marginRight: SPACING.sm },
  warning: { color: COLORS.danger, marginBottom: SPACING.md, fontSize: 13 },
  result: { marginTop: SPACING.md },
  gap: { height: SPACING.sm },
  preview: { backgroundColor: '#FAFAFA', borderColor: COLORS.border, borderWidth: 1, borderRadius: RADIUS.sm, padding: SPACING.sm, marginTop: SPACING.md },
  previewText: { fontSize: 11, color: COLORS.textSub, fontFamily: 'monospace' },
});

export default ExportScreen;

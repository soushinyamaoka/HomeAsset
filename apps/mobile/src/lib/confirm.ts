import { Alert } from 'react-native';

// 破壊的操作（削除・廃棄・交換など）の確認ダイアログを統一するヘルパー
export function confirmDestructive(opts: {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
}) {
  Alert.alert(opts.title, opts.message, [
    { text: 'キャンセル', style: 'cancel' },
    { text: opts.confirmLabel ?? '削除', style: 'destructive', onPress: opts.onConfirm },
  ]);
}

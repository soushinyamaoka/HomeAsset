import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING } from '../theme';

interface Props extends ViewProps {
  title: string;
  action?: React.ReactNode;
  /** 見出しタップで開閉できるようにする */
  collapsible?: boolean;
  /** 初期状態を折りたたみにする（collapsible時のみ有効） */
  defaultCollapsed?: boolean;
  /** 見出し右に件数バッジを表示する */
  count?: number;
}

export const Section: React.FC<Props> = ({
  title,
  action,
  collapsible,
  defaultCollapsed,
  count,
  children,
  style,
  ...rest
}) => {
  const [collapsed, setCollapsed] = useState(!!defaultCollapsed);
  const showChildren = !collapsible || !collapsed;

  return (
    <View {...rest} style={[styles.section, style]}>
      <View style={styles.header}>
        {collapsible ? (
          <TouchableOpacity
            style={styles.titleTouch}
            onPress={() => setCollapsed((c) => !c)}
            activeOpacity={0.6}
          >
            <Ionicons
              name={collapsed ? 'chevron-forward' : 'chevron-down'}
              size={18}
              color={COLORS.textSub}
            />
            <Text style={[styles.title, styles.titleCollapsible]}>{title}</Text>
            {count != null ? (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{count}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        ) : (
          <Text style={styles.title}>{title}</Text>
        )}
        {action ? <View>{action}</View> : null}
      </View>
      {showChildren ? children : null}
    </View>
  );
};

const styles = StyleSheet.create({
  section: { marginBottom: SPACING.lg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  titleTouch: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  titleCollapsible: { marginLeft: 4 },
  countBadge: {
    minWidth: 22,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },
  countText: { fontSize: 12, fontWeight: '700', color: COLORS.textSub },
});

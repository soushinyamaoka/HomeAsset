import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../theme';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  helper?: string;
}

export const TextField: React.FC<Props> = ({
  label,
  error,
  helper,
  style,
  multiline,
  ...rest
}) => {
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        {...rest}
        multiline={multiline}
        style={[
          styles.input,
          multiline && { minHeight: 100, textAlignVertical: 'top' },
          error ? { borderColor: COLORS.danger } : null,
          style as any,
        ]}
        placeholderTextColor={COLORS.textMuted}
      />
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : helper ? (
        <Text style={styles.helper}>{helper}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: SPACING.md },
  label: { fontSize: 14, color: COLORS.textSub, marginBottom: SPACING.xs, fontWeight: '600' },
  input: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
  },
  error: { color: COLORS.danger, marginTop: SPACING.xs, fontSize: 12 },
  helper: { color: COLORS.textMuted, marginTop: SPACING.xs, fontSize: 12 },
});

import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';
import type { IoniconName } from '../types';
import { AppText } from './AppText';
import { SelectModal, type SelectOption } from './SelectModal';

export interface PickerFieldProps {
  label: string;
  placeholder: string;
  options: SelectOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  modalTitle?: string;
  icon?: IoniconName;
  searchable?: boolean;
  accessibilityHint?: string;
}

/** Campo de seleção acessível: mostra o valor atual e abre um SelectModal em tela cheia. */
function PickerFieldBase({
  label,
  placeholder,
  options,
  selectedId,
  onSelect,
  modalTitle,
  icon = 'location',
  searchable = false,
  accessibilityHint,
}: PickerFieldProps) {
  const { theme } = useAppTheme();
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => options.find((o) => o.id === selectedId) ?? null, [options, selectedId]);

  const openModal = useCallback(() => setOpen(true), []);
  const closeModal = useCallback(() => setOpen(false), []);
  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id);
      setOpen(false);
    },
    [onSelect],
  );

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <AppText variant="label" nativeID={`label-${label}`}>
        {label}
      </AppText>
      <Pressable
        onPress={openModal}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected ? selected.title : 'nenhum selecionado'}`}
        accessibilityHint={accessibilityHint ?? 'Abre a lista de opções'}
        style={({ pressed }) => [
          styles.field,
          {
            minHeight: theme.touchTarget + 8,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            borderRadius: theme.radius.md,
            borderColor: theme.colors.border,
            borderWidth: theme.borderWidth + 1,
            backgroundColor: theme.colors.surface,
          },
          pressed ? styles.pressed : null,
        ]}
      >
        <Ionicons name={icon} size={22 * theme.fontScale} color={theme.colors.primary} />
        <View style={styles.flex}>
          <AppText variant="bodyLarge" color={selected ? 'text' : 'textMuted'} numberOfLines={2}>
            {selected ? selected.title : placeholder}
          </AppText>
          {selected?.subtitle ? (
            <AppText variant="caption" color="textMuted" numberOfLines={1}>
              {selected.subtitle}
            </AppText>
          ) : null}
        </View>
        <Ionicons name="chevron-down" size={22 * theme.fontScale} color={theme.colors.textMuted} />
      </Pressable>

      <SelectModal
        visible={open}
        title={modalTitle ?? label}
        options={options}
        selectedId={selectedId}
        onSelect={handleSelect}
        onClose={closeModal}
        searchable={searchable}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pressed: { opacity: 0.8 },
  flex: { flex: 1 },
});

export const PickerField = memo(PickerFieldBase);

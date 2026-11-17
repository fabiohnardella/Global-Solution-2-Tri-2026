import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View, type ListRenderItem } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../context/ThemeContext';
import type { IoniconName } from '../types';
import { normalizeForSearch } from '../utils/format';
import { AppText } from './AppText';
import { EmptyState } from './EmptyState';
import { IconButton } from './IconButton';

export interface SelectOption {
  id: string;
  title: string;
  subtitle?: string;
  icon?: IoniconName;
  disabled?: boolean;
  disabledReason?: string;
}

export interface SelectModalProps {
  visible: boolean;
  title: string;
  options: SelectOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
  searchable?: boolean;
  searchPlaceholder?: string;
}

/* ------------------------------ Item da lista ----------------------------- */

interface OptionRowProps {
  option: SelectOption;
  selected: boolean;
  onSelect: (id: string) => void;
}

function OptionRowBase({ option, selected, onSelect }: OptionRowProps) {
  const { theme } = useAppTheme();
  const handlePress = useCallback(() => onSelect(option.id), [onSelect, option.id]);
  const disabled = Boolean(option.disabled);

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected, disabled }}
      accessibilityLabel={`${option.title}${option.subtitle ? `, ${option.subtitle}` : ''}${
        disabled && option.disabledReason ? `. ${option.disabledReason}` : ''
      }`}
      style={({ pressed }) => [
        styles.row,
        {
          minHeight: theme.touchTarget + 16,
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
          backgroundColor: selected ? theme.colors.surfaceAlt : theme.colors.surface,
          borderBottomColor: theme.colors.border,
          borderBottomWidth: theme.isHighContrast ? theme.borderWidth : StyleSheet.hairlineWidth,
          opacity: disabled ? 0.5 : 1,
        },
        pressed ? styles.pressed : null,
      ]}
    >
      {option.icon ? <Ionicons name={option.icon} size={24 * theme.fontScale} color={theme.colors.text} /> : null}
      <View style={styles.flex}>
        <AppText variant="bodyLarge" weight={selected ? '800' : '500'}>
          {option.title}
        </AppText>
        {option.subtitle ? (
          <AppText variant="caption" color="textMuted">
            {option.subtitle}
          </AppText>
        ) : null}
        {disabled && option.disabledReason ? (
          <AppText variant="caption" color="textMuted">
            {option.disabledReason}
          </AppText>
        ) : null}
      </View>
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={24 * theme.fontScale}
        color={selected ? theme.colors.primary : theme.colors.textMuted}
      />
    </Pressable>
  );
}

// [MEMORY MANAGEMENT] Item memoizado: ao trocar a seleção só 2 linhas re-renderizam.
const OptionRow = memo(OptionRowBase);

/* ---------------------------------- Modal --------------------------------- */

function SelectModalBase({
  visible,
  title,
  options,
  selectedId,
  onSelect,
  onClose,
  searchable = false,
  searchPlaceholder = 'Buscar...',
}: SelectModalProps) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  // Limpa a busca sempre que o modal fecha.
  useEffect(() => {
    if (!visible) setQuery('');
  }, [visible]);

  // [MEMORY MANAGEMENT] Filtragem memoizada por texto da busca.
  const filtered = useMemo(() => {
    const q = normalizeForSearch(query);
    if (!q) return options;
    return options.filter((o) => normalizeForSearch(`${o.title} ${o.subtitle ?? ''}`).includes(q));
  }, [options, query]);

  const renderItem = useCallback<ListRenderItem<SelectOption>>(
    ({ item }) => <OptionRow option={item} selected={item.id === selectedId} onSelect={onSelect} />,
    [selectedId, onSelect],
  );

  const keyExtractor = useCallback((item: SelectOption) => item.id, []);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="fullScreen">
      <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <View
          style={[
            styles.header,
            {
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: theme.spacing.sm,
              backgroundColor: theme.colors.surface,
              borderBottomColor: theme.colors.border,
              borderBottomWidth: theme.borderWidth,
            },
          ]}
        >
          <AppText variant="title" accessibilityRole="header" style={styles.flex}>
            {title}
          </AppText>
          <IconButton icon="close" accessibilityLabel="Fechar lista" onPress={onClose} />
        </View>

        {searchable ? (
          <View style={{ padding: theme.spacing.lg, backgroundColor: theme.colors.surface }}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder}
              placeholderTextColor={theme.colors.textMuted}
              accessibilityLabel={searchPlaceholder}
              autoCorrect={false}
              style={[
                theme.typography.bodyLarge,
                styles.input,
                {
                  minHeight: theme.touchTarget,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                  borderWidth: theme.borderWidth,
                  borderRadius: theme.radius.md,
                  paddingHorizontal: theme.spacing.md,
                  backgroundColor: theme.colors.surface,
                },
              ]}
            />
          </View>
        ) : null}

        {/* [MEMORY MANAGEMENT] FlatList otimizada: virtualização + lotes pequenos. */}
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          extraData={selectedId}
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + theme.spacing.xl }}
          ListEmptyComponent={
            <EmptyState icon="search" title="Nada encontrado" message="Tente outra palavra para a busca." />
          }
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  input: {},
  pressed: { opacity: 0.75 },
  flex: { flex: 1 },
});

export const SelectModal = memo(SelectModalBase);

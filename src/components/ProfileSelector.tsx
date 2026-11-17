import { Ionicons } from '@expo/vector-icons';
import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { PROFILE_LIST } from '../data/catalog';
import { useAppTheme } from '../context/ThemeContext';
import type { MobilityProfile, MobilityProfileId } from '../types';
import { AppText } from './AppText';

interface ProfileOptionProps {
  profile: MobilityProfile;
  selected: boolean;
  onSelect: (id: MobilityProfileId) => void;
}

function ProfileOptionBase({ profile, selected, onSelect }: ProfileOptionProps) {
  const { theme } = useAppTheme();
  const handlePress = useCallback(() => onSelect(profile.id), [onSelect, profile.id]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={`${profile.label}. ${profile.description}`}
      style={({ pressed }) => [
        styles.option,
        {
          minHeight: theme.touchTarget + 16,
          padding: theme.spacing.md,
          gap: theme.spacing.md,
          borderRadius: theme.radius.md,
          backgroundColor: selected ? theme.colors.surfaceAlt : theme.colors.surface,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          borderWidth: selected ? theme.borderWidth + 2 : theme.borderWidth,
        },
        pressed ? styles.pressed : null,
      ]}
    >
      <Ionicons name={profile.icon} size={28 * theme.fontScale} color={selected ? theme.colors.primary : theme.colors.text} />
      <View style={styles.flex}>
        <AppText variant="label">{profile.label}</AppText>
        <AppText variant="caption" color="textMuted">
          {profile.description}
        </AppText>
      </View>
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={24 * theme.fontScale}
        color={selected ? theme.colors.primary : theme.colors.textMuted}
      />
    </Pressable>
  );
}

const ProfileOption = memo(ProfileOptionBase);

export interface ProfileSelectorProps {
  value: MobilityProfileId;
  onChange: (id: MobilityProfileId) => void;
}

/** Seleção do perfil de mobilidade: muda os pesos do comparador de rotas. */
function ProfileSelectorBase({ value, onChange }: ProfileSelectorProps) {
  const { theme } = useAppTheme();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Perfil de mobilidade" style={{ gap: theme.spacing.sm }}>
      {PROFILE_LIST.map((profile) => (
        <ProfileOption key={profile.id} profile={profile} selected={profile.id === value} onSelect={onChange} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  option: { flexDirection: 'row', alignItems: 'center' },
  pressed: { opacity: 0.8 },
  flex: { flex: 1 },
});

export const ProfileSelector = memo(ProfileSelectorBase);

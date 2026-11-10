import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { typography, spacing } from '../../theme';
import { useThemeStore } from '../../store/useThemeStore';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showProfile?: boolean;
  userName?: string;
  onRightActionPress?: () => void;
  rightActionIcon?: keyof typeof Ionicons.glyphMap;
  rightActionBadge?: number;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showProfile = false,
  userName = 'Usuario',
  onRightActionPress,
  rightActionIcon = 'options-outline',
  rightActionBadge,
}) => {
  const { palette, setSettingsModalVisible } = useThemeStore();
  const handleRightPress =
    onRightActionPress ?? (() => setSettingsModalVisible(true));

  return (
    <View style={styles.container}>
      <View style={styles.textContainer}>
        {showProfile && (
          <View style={styles.profileRow}>
            <Image
              source={require('../../../assets/user_avatar.jpg')}
              style={styles.profileLogo}
              resizeMode="cover"
            />
            <Text style={[styles.greetingText, { color: palette.cyanLight }]}>
              Hola,{' '}
              <Text style={{ color: palette.textPrimary }}>{userName}</Text> 👋
            </Text>
          </View>
        )}
        <Text style={[styles.title, { color: palette.textPrimary }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleRightPress}
        style={[
          styles.actionButton,
          {
            backgroundColor: palette.surfaceLight,
            borderColor: palette.borderLight,
          },
        ]}
      >
        <Ionicons
          name={rightActionIcon}
          size={20}
          color={palette.textPrimary}
        />
        {typeof rightActionBadge === 'number' && rightActionBadge > 0 && (
          <View style={[styles.badge, { backgroundColor: palette.danger }]}>
            <Text style={styles.badgeText}>
              {rightActionBadge > 9 ? '9+' : rightActionBadge}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  textContainer: {
    flex: 1,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  profileLogo: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: 8,
  },
  greetingText: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  title: {
    ...typography.h1,
  },
  subtitle: {
    ...typography.subtitle,
    marginTop: 2,
  },
  actionButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.md,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
});

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Task } from '../../../types';
import { GlassCard, Badge } from '../../../components/common';
import { colors, ThemePalette, borderRadius, typography } from '../../../theme';
import { useThemeStore } from '../../../store/useThemeStore';

interface TaskCardProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onPressReminder?: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggle,
  onDelete,
  onPressReminder,
}) => {
  const { palette: colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleToggle = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // fallback
    }
    onToggle(task.id);
  };

  const confirmDelete = () => {
    Alert.alert(
      'Eliminar Tarea',
      `¿Estás seguro de eliminar "${task.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => onDelete(task.id) },
      ]
    );
  };

  const getPriorityColor = () => {
    switch (task.priority) {
      case 'Alta':
        return colors.danger;
      case 'Media':
        return colors.warning;
      case 'Baja':
        return colors.mint;
      default:
        return colors.cyanLight;
    }
  };

  const dateObj = new Date(task.alarmTime || task.dueDate);
  const formattedDate = dateObj.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
  });
  const formattedTime = dateObj.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const isFutureAlarm =
    task.hasAlarm &&
    !task.completed &&
    dateObj.getTime() > Date.now();

  return (
    <GlassCard style={[styles.card, task.completed && styles.cardCompleted]}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleToggle}
        style={styles.checkboxTouch}
      >
        <View style={[styles.checkbox, task.completed && styles.checkboxActive]}>
          {task.completed && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={onPressReminder ? 0.8 : 1}
        onPress={() => onPressReminder?.(task)}
        style={styles.body}
      >
        <Text
          style={[styles.title, task.completed && styles.titleCompleted]}
          numberOfLines={2}
        >
          {task.title}
        </Text>

        {task.description ? (
          <Text
            style={[styles.description, task.completed && styles.descriptionCompleted]}
            numberOfLines={2}
          >
            {task.description}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          <Badge
            label={task.category}
            color={colors.cyanLight}
            style={{ marginRight: 6 }}
          />
          <Badge
            label={task.priority}
            color={getPriorityColor()}
            style={{ marginRight: 8 }}
          />

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => onPressReminder?.(task)}
            style={[
              styles.reminderPill,
              task.hasAlarm && styles.reminderPillActive,
              isFutureAlarm && styles.reminderPillScheduled,
            ]}
          >
            <Ionicons
              name={task.hasAlarm ? 'alarm' : 'calendar-outline'}
              size={12}
              color={task.hasAlarm ? colors.cyanLight : colors.textMuted}
            />
            <Text
              style={[
                styles.dueDateText,
                task.hasAlarm && styles.dueDateTextActive,
              ]}
            >
              {formattedDate}
              {task.hasAlarm ? ` • ${formattedTime}` : ' • + Recordatorio'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      <View style={styles.actionsColumn}>
        {onPressReminder && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => onPressReminder(task)}
            style={[
              styles.alarmActionButton,
              task.hasAlarm && styles.alarmActionButtonActive,
            ]}
          >
            <Ionicons
              name={task.hasAlarm ? 'notifications' : 'notifications-outline'}
              size={16}
              color={task.hasAlarm ? colors.cyanLight : colors.textMuted}
            />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={confirmDelete}
          style={styles.deleteButton}
        >
          <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </GlassCard>
  );
};

const createStyles = (colors: ThemePalette) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 14,
      marginBottom: 10,
    },
    cardCompleted: {
      opacity: 0.65,
    },
    checkboxTouch: {
      padding: 4,
      marginRight: 10,
      marginTop: 2,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    body: {
      flex: 1,
    },
    title: {
      ...typography.body,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    titleCompleted: {
      textDecorationLine: 'line-through',
      color: colors.textMuted,
    },
    description: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 4,
      lineHeight: 18,
    },
    descriptionCompleted: {
      textDecorationLine: 'line-through',
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      flexWrap: 'wrap',
      rowGap: 6,
    },
    reminderPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: borderRadius.full,
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: colors.border,
    },
    reminderPillActive: {
      backgroundColor: `${colors.cyan}18`,
      borderColor: `${colors.cyan}55`,
    },
    reminderPillScheduled: {
      backgroundColor: `${colors.cyan}22`,
      borderColor: colors.cyanLight,
    },
    dueDateText: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textMuted,
      marginLeft: 4,
    },
    dueDateTextActive: {
      color: colors.cyanLight,
      fontWeight: '700',
    },
    actionsColumn: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 4,
      gap: 2,
    },
    alarmActionButton: {
      width: 30,
      height: 30,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceLight,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    alarmActionButtonActive: {
      backgroundColor: `${colors.cyan}20`,
      borderColor: `${colors.cyan}55`,
    },
    deleteButton: {
      padding: 6,
    },
  });

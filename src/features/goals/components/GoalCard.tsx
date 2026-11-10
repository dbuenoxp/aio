import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Goal } from '../../../types';
import { GlassCard, ProgressBar, Badge } from '../../../components/common';
import { colors, ThemePalette, borderRadius, typography } from '../../../theme';
import { useThemeStore } from '../../../store/useThemeStore';

interface GoalCardProps {
  goal: Goal;
  onToggleMilestone: (milestoneId: string, goalId: string) => void;
  onAddMilestone: (goalId: string, title: string) => void;
  onDeleteGoal: (goalId: string) => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  onToggleMilestone,
  onAddMilestone,
  onDeleteGoal,
}) => {
  const { palette: colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [expanded, setExpanded] = useState(false);
  const [newHitoText, setNewHitoText] = useState('');
  const [showAddHito, setShowAddHito] = useState(false);

  const handleToggle = async (milestoneId: string) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // fallback
    }
    onToggleMilestone(milestoneId, goal.id);
  };

  const handleAddHitoSubmit = () => {
    if (!newHitoText.trim()) return;
    onAddMilestone(goal.id, newHitoText.trim());
    setNewHitoText('');
    setShowAddHito(false);
  };

  const confirmDelete = () => {
    Alert.alert(
      'Eliminar Meta',
      `¿Deseas eliminar la meta "${goal.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => onDeleteGoal(goal.id) },
      ]
    );
  };

  const getTermColor = () => {
    switch (goal.term) {
      case 'Corto':
        return colors.mint;
      case 'Mediano':
        return colors.cyanLight;
      case 'Largo':
        return colors.purple;
      default:
        return colors.primaryLight;
    }
  };

  const targetDateStr = new Date(goal.targetDate).toLocaleDateString('es-ES', {
    month: 'short',
    year: 'numeric',
  });

  const completedMilestones = (goal.milestones || []).filter((m) => m.completed).length;
  const totalMilestones = (goal.milestones || []).length;

  return (
    <GlassCard style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.badgesGroup}>
          <Badge
            label={`${goal.term} Plazo`}
            color={getTermColor()}
            style={{ marginRight: 6 }}
          />
          <Badge label={goal.category} color={colors.textSecondary} />
        </View>

        <TouchableOpacity onPress={confirmDelete} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>{goal.title}</Text>
      {goal.description ? (
        <Text style={styles.description}>{goal.description}</Text>
      ) : null}

      {/* Progress Section */}
      <View style={styles.progressContainer}>
        <View style={styles.progressInfoRow}>
          <Text style={styles.targetDateText}>
            Meta: {targetDateStr}
          </Text>
          <Text style={styles.progressPercentage}>{goal.progress}%</Text>
        </View>

        <ProgressBar
          progress={goal.progress}
          height={8}
          gradientColors={colors.gradients.mintCyan}
        />
      </View>

      {/* Milestones Accordion Header */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setExpanded((prev) => !prev)}
        style={styles.milestoneToggleRow}
      >
        <View style={styles.milestoneCountRow}>
          <Ionicons name="flag-outline" size={16} color={colors.cyanLight} />
          <Text style={styles.milestoneToggleText}>
            Hitos: {completedMilestones} de {totalMilestones} completados
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {/* Expanded Milestones Content */}
      {expanded && (
        <View style={styles.milestonesList}>
          {(goal.milestones || []).map((m) => (
            <TouchableOpacity
              key={m.id}
              activeOpacity={0.7}
              onPress={() => handleToggle(m.id)}
              style={styles.milestoneItem}
            >
              <View style={[styles.mCheckbox, m.completed && styles.mCheckboxActive]}>
                {m.completed && <Ionicons name="checkmark" size={12} color="#FFF" />}
              </View>
              <Text
                style={[styles.mTitle, m.completed && styles.mTitleCompleted]}
                numberOfLines={2}
              >
                {m.title}
              </Text>
            </TouchableOpacity>
          ))}

          {/* Add Hito Inline */}
          {showAddHito ? (
            <View style={styles.addHitoInlineRow}>
              <TextInput
                placeholder="Nombre del nuevo hito..."
                placeholderTextColor={colors.textMuted}
                value={newHitoText}
                onChangeText={setNewHitoText}
                style={styles.addHitoInput}
                autoFocus
              />
              <TouchableOpacity
                onPress={handleAddHitoSubmit}
                style={styles.confirmHitoBtn}
              >
                <Ionicons name="checkmark" size={18} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowAddHito(false)}
                style={styles.cancelHitoBtn}
              >
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setShowAddHito(true)}
              style={styles.addHitoAction}
            >
              <Ionicons name="add-circle-outline" size={16} color={colors.cyanLight} />
              <Text style={styles.addHitoActionText}>Añadir nuevo hito</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </GlassCard>
  );
};

const createStyles = (colors: ThemePalette) =>
  StyleSheet.create({
    card: {
      padding: 16,
      marginBottom: 12,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    badgesGroup: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    deleteBtn: {
      padding: 4,
    },
    title: {
      ...typography.h3,
      color: colors.textPrimary,
      marginBottom: 4,
    },
    description: {
      ...typography.caption,
      color: colors.textSecondary,
      marginBottom: 12,
      lineHeight: 18,
    },
    progressContainer: {
      marginTop: 6,
      marginBottom: 12,
    },
    progressInfoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    targetDateText: {
      ...typography.caption,
      color: colors.textMuted,
    },
    progressPercentage: {
      ...typography.caption,
      fontWeight: '700',
      color: colors.mintLight,
    },
    milestoneToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    milestoneCountRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    milestoneToggleText: {
      ...typography.caption,
      color: colors.textSecondary,
      fontWeight: '600',
      marginLeft: 6,
    },
    milestonesList: {
      marginTop: 10,
      paddingLeft: 4,
    },
    milestoneItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
    },
    mCheckbox: {
      width: 18,
      height: 18,
      borderRadius: 5,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    mCheckboxActive: {
      backgroundColor: colors.mint,
      borderColor: colors.mint,
    },
    mTitle: {
      ...typography.body,
      fontSize: 13,
      color: colors.textPrimary,
      flex: 1,
    },
    mTitleCompleted: {
      textDecorationLine: 'line-through',
      color: colors.textMuted,
    },
    addHitoAction: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      marginTop: 4,
    },
    addHitoActionText: {
      ...typography.caption,
      color: colors.cyanLight,
      fontWeight: '600',
      marginLeft: 6,
    },
    addHitoInlineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      backgroundColor: colors.surfaceLight,
      borderRadius: borderRadius.md,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    addHitoInput: {
      flex: 1,
      ...typography.body,
      color: colors.textPrimary,
      fontSize: 13,
      paddingVertical: 8,
    },
    confirmHitoBtn: {
      backgroundColor: colors.mint,
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 6,
    },
    cancelHitoBtn: {
      padding: 6,
      marginLeft: 4,
    },
  });

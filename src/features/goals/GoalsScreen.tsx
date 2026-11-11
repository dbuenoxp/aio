import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useGoalStore } from '../../store/useGoalStore';
import { useThemeStore } from '../../store/useThemeStore';
import { Header, FloatingActionButton } from '../../components/common';
import { GoalCard } from './components/GoalCard';
import { CreateGoalModal } from './components/CreateGoalModal';
import { colors, ThemePalette, borderRadius, typography, spacing } from '../../theme';

const TERM_FILTERS = ['Todos', 'Corto', 'Mediano', 'Largo'];

export const GoalsScreen: React.FC = () => {
  const { palette: colors } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const {
    goals,
    loadGoals,
    toggleMilestone,
    addMilestone,
    deleteGoal,
    selectedTerm,
    setSelectedTerm,
  } = useGoalStore();

  const [createModalVisible, setCreateModalVisible] = useState(false);

  useEffect(() => {
    loadGoals();
  }, []);

  const filteredGoals = goals.filter((g) => {
    if (selectedTerm === 'Todos') return true;
    return g.term === selectedTerm;
  });

  const averageProgress =
    goals.length > 0
      ? Math.round(goals.reduce((acc, g) => acc + g.progress, 0) / goals.length)
      : 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style={colors.isDark ? 'light' : 'dark'} />

      <Header
        title="Metas & Proyecciones"
        subtitle={`${goals.length} metas activas • ${averageProgress}% progreso promedio`}
      />

      {/* Term Horizon Filters */}
      <View style={styles.termFiltersContainer}>
        {TERM_FILTERS.map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setSelectedTerm(t)}
            style={[
              styles.termButton,
              selectedTerm === t && styles.termButtonActive,
            ]}
          >
            <Text
              style={[
                styles.termText,
                selectedTerm === t && styles.termTextActive,
              ]}
            >
              {t} Plazo
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Goals List */}
      <FlatList
        data={filteredGoals}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <GoalCard
            goal={item}
            onToggleMilestone={toggleMilestone}
            onAddMilestone={addMilestone}
            onDeleteGoal={deleteGoal}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="trophy-outline" size={54} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Sin metas registradas</Text>
            <Text style={styles.emptySubtitle}>
              Crea tu primera meta pulsando el botón + para proyectar tus logros personales.
            </Text>
          </View>
        }
      />

      <FloatingActionButton
        onPress={() => setCreateModalVisible(true)}
        icon="add"
      />

      <CreateGoalModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const createStyles = (colors: ThemePalette) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    termFiltersContainer: {
      flexDirection: 'row',
      marginHorizontal: spacing.lg,
      backgroundColor: colors.surfaceLight,
      borderRadius: borderRadius.md,
      padding: 4,
      marginBottom: 14,
    },
    termButton: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: borderRadius.sm,
    },
    termButtonActive: {
      backgroundColor: colors.primary,
    },
    termText: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    termTextActive: {
      color: '#FFF',
      fontWeight: '700',
    },
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: 90,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyTitle: {
      ...typography.h3,
      color: colors.textPrimary,
      marginTop: 12,
    },
    emptySubtitle: {
      ...typography.caption,
      color: colors.textMuted,
      textAlign: 'center',
      maxWidth: 260,
      marginTop: 6,
    },
  });

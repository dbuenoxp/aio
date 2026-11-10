import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useTaskStore } from '../../store/useTaskStore';
import { useThemeStore } from '../../store/useThemeStore';
import { Task } from '../../types';
import { Header, FloatingActionButton } from '../../components/common';
import { TaskCard } from './components/TaskCard';
import { CreateTaskModal } from './components/CreateTaskModal';
import { TaskReminderModal } from './components/TaskReminderModal';
import { colors, ThemePalette, borderRadius, typography, spacing } from '../../theme';

const CATEGORY_FILTERS = ['Todas', 'Trabajo', 'Personal', 'Proyectos', 'Salud', 'Finanzas'];
const STATUS_FILTERS: {
  label: string;
  value: 'all' | 'pending' | 'reminders' | 'completed';
}[] = [
    { label: 'Todas', value: 'all' },
    { label: 'Pendientes', value: 'pending' },
    { label: '⏰ Alarmas', value: 'reminders' },
    { label: 'Completadas', value: 'completed' },
  ];

export const TasksScreen: React.FC = () => {
  const { palette } = useThemeStore();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const {
    tasks,
    loadTasks,
    toggleTask,
    deleteTask,
    selectedCategory,
    selectedStatus,
    setSelectedCategory,
    setSelectedStatus,
  } = useTaskStore();

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [reminderTask, setReminderTask] = useState<Task | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  // Filter tasks based on selected category and status
  const filteredTasks = tasks.filter((t) => {
    const matchesCategory =
      selectedCategory === 'Todas' || t.category === selectedCategory;
    const matchesStatus =
      selectedStatus === 'all' ||
      (selectedStatus === 'pending' && !t.completed) ||
      (selectedStatus === 'reminders' && t.hasAlarm) ||
      (selectedStatus === 'completed' && t.completed);

    return matchesCategory && matchesStatus;
  });

  const pendingCount = tasks.filter((t) => !t.completed).length;
  const completedCount = tasks.filter((t) => t.completed).length;
  const activeAlarmsCount = tasks.filter((t) => !t.completed && t.hasAlarm).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style={colors.isDark ? 'light' : 'dark'} />

      <Header
        title="Task Hub"
        subtitle={`${pendingCount} pendientes • ${activeAlarmsCount} con alarma • ${completedCount} completadas`}
      />

      {/* Status Segment Control */}
      <View style={styles.statusSegmentContainer}>
        {STATUS_FILTERS.map((s) => (
          <TouchableOpacity
            key={s.value}
            onPress={() => setSelectedStatus(s.value)}
            style={[
              styles.statusButton,
              selectedStatus === s.value && styles.statusButtonActive,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                selectedStatus === s.value && styles.statusTextActive,
              ]}
            >
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Category Filter Horizontal Scroll */}
      <View style={styles.categoriesWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORY_FILTERS}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.categoriesList}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelectedCategory(item)}
              style={[
                styles.categoryChip,
                selectedCategory === item && styles.categoryChipActive,
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === item && styles.categoryTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Tasks List */}
      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onToggle={toggleTask}
            onDelete={deleteTask}
            onPressReminder={(t) => setReminderTask(t)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="clipboard-outline" size={54} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Sin tareas encontradas</Text>
            <Text style={styles.emptySubtitle}>
              {selectedStatus === 'completed'
                ? 'Aún no has completado tareas con este filtro.'
                : selectedStatus === 'reminders'
                  ? 'No tienes tareas con recordatorio o alarma en esta categoría.'
                  : 'Crea tu primera tarea pulsando el botón + abajo.'}
            </Text>
          </View>
        }
      />

      <FloatingActionButton
        onPress={() => setCreateModalVisible(true)}
        icon="add"
      />

      <CreateTaskModal
        visible={createModalVisible}
        onClose={() => setCreateModalVisible(false)}
      />

      <TaskReminderModal
        visible={!!reminderTask}
        task={reminderTask}
        onClose={() => setReminderTask(null)}
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
    statusSegmentContainer: {
      flexDirection: 'row',
      marginHorizontal: spacing.lg,
      backgroundColor: colors.surfaceLight,
      borderRadius: borderRadius.md,
      padding: 3,
      marginBottom: 12,
    },
    statusButton: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: borderRadius.sm,
    },
    statusButtonActive: {
      backgroundColor: colors.primary,
    },
    statusText: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    statusTextActive: {
      color: '#FFF',
      fontWeight: '700',
    },
    categoriesWrapper: {
      marginBottom: 12,
    },
    categoriesList: {
      paddingHorizontal: spacing.lg,
      gap: 8,
    },
    categoryChip: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: borderRadius.full,
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.surfaceGlassBorder,
    },
    categoryChipActive: {
      backgroundColor: `${colors.cyan}22`,
      borderColor: colors.cyanLight,
    },
    categoryText: {
      ...typography.caption,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    categoryTextActive: {
      color: colors.cyanLight,
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
      maxWidth: 240,
      marginTop: 6,
    },
  });

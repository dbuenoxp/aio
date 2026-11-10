import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFitnessStore } from '../../store/useFitnessStore';
import { useThemeStore } from '../../store/useThemeStore';
import { Header, GlassCard, Badge, FloatingActionButton } from '../../components/common';
import { WaterTracker } from './components/WaterTracker';
import { WeightGoalCard } from './components/WeightGoalCard';
import { WorkoutModal } from './components/WorkoutModal';
import { colors, ThemePalette, borderRadius, typography, spacing } from '../../theme';

export const FitnessScreen: React.FC = () => {
  const { palette: colors, setSettingsModalVisible } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const {
    profile,
    todayWater,
    workouts,
    loadFitness,
    updateProfile,
    addWeight,
    incrementWater,
    decrementWater,
    toggleHydrationReminder,
    toggleWorkout,
  } = useFitnessStore();

  const [workoutModalVisible, setWorkoutModalVisible] = useState(false);

  useEffect(() => {
    loadFitness();
  }, []);

  const totalCaloriesWeek = workouts
    .filter((w) => w.completed)
    .reduce((acc, w) => acc + w.caloriesBurned, 0);

  const totalMinutesWeek = workouts
    .filter((w) => w.completed)
    .reduce((acc, w) => acc + w.durationMinutes, 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style={colors.isDark ? 'light' : 'dark'} />

      <Header
        title="Fitness & Bienestar"
        subtitle="Peso, hidratación y entrenamientos en sincronía"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Weight vs Target Goal Card */}
        <WeightGoalCard
          profile={profile}
          onAddWeight={async (weight, note) => {
            await addWeight(weight, note);
          }}
          onUpdateTarget={async (targetWeight, initialWeight) => {
            await updateProfile({ targetWeight, initialWeight });
          }}
        />

        {/* Interactive Water Tracker */}
        <WaterTracker
          waterLog={todayWater}
          reminderEnabled={profile.hydrationReminderEnabled}
          reminderHours={profile.hydrationReminderIntervalHours}
          onIncrement={incrementWater}
          onDecrement={decrementWater}
          onToggleReminder={toggleHydrationReminder}
        />

        {/* Weekly Workout Summary Stats */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Entrenamientos Semanales</Text>
          <Badge
            label={`${totalMinutesWeek} min • ${totalCaloriesWeek} kcal`}
            color={colors.cyanLight}
          />
        </View>

        {workouts.map((workout) => (
          <GlassCard key={workout.id} style={styles.workoutCard}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => toggleWorkout(workout.id)}
              style={styles.workoutCheckboxTouch}
            >
              <View
                style={[
                  styles.workoutCheckbox,
                  workout.completed && styles.workoutCheckboxActive,
                ]}
              >
                {workout.completed && (
                  <Ionicons name="checkmark" size={14} color="#FFF" />
                )}
              </View>
            </TouchableOpacity>

            <View style={styles.workoutInfo}>
              <Text
                style={[
                  styles.workoutTitle,
                  workout.completed && styles.workoutTitleCompleted,
                ]}
              >
                {workout.title}
              </Text>
              <View style={styles.workoutMetaRow}>
                <Badge
                  label={workout.category}
                  color={colors.mintLight}
                  style={{ marginRight: 8 }}
                />
                <View style={styles.metaStat}>
                  <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.metaStatText}>
                    {workout.durationMinutes} min
                  </Text>
                </View>
                <View style={styles.metaStat}>
                  <Ionicons name="flame-outline" size={12} color={colors.warning} />
                  <Text style={styles.metaStatText}>
                    {workout.caloriesBurned} kcal
                  </Text>
                </View>
              </View>
            </View>
          </GlassCard>
        ))}

        {workouts.length === 0 && (
          <View style={styles.emptyWorkouts}>
            <Ionicons name="barbell-outline" size={44} color={colors.textMuted} />
            <Text style={styles.emptyText}>
              Sin entrenamientos registrados aún.
            </Text>
          </View>
        )}

        <View style={{ height: 90 }} />
      </ScrollView>

      <FloatingActionButton
        onPress={() => setWorkoutModalVisible(true)}
        icon="add"
      />

      <WorkoutModal
        visible={workoutModalVisible}
        onClose={() => setWorkoutModalVisible(false)}
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
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: 4,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 12,
    },
    sectionTitle: {
      ...typography.h3,
      color: colors.textPrimary,
      fontSize: 16,
    },
    workoutCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      marginBottom: 10,
    },
    workoutCheckboxTouch: {
      padding: 4,
      marginRight: 10,
    },
    workoutCheckbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    workoutCheckboxActive: {
      backgroundColor: colors.mint,
      borderColor: colors.mint,
    },
    workoutInfo: {
      flex: 1,
    },
    workoutTitle: {
      ...typography.body,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 6,
    },
    workoutTitleCompleted: {
      textDecorationLine: 'line-through',
      color: colors.textMuted,
    },
    workoutMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    metaStat: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 12,
    },
    metaStatText: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textMuted,
      marginLeft: 3,
    },
    emptyWorkouts: {
      alignItems: 'center',
      paddingVertical: 30,
    },
    emptyText: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: 8,
    },
  });

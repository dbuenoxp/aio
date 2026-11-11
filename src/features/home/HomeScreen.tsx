import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { MainTabParamList } from '../../navigation/types';
import { Transaction, Task } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';
import { useTaskStore } from '../../store/useTaskStore';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useFitnessStore } from '../../store/useFitnessStore';
import { useGoalStore } from '../../store/useGoalStore';
import { useThemeStore } from '../../store/useThemeStore';
import {
  GlassCard,
  ProgressBar,
  Badge,
  FloatingActionButton,
} from '../../components/common';
import { QuickActionModal } from './components/QuickActionModal';
import { TransactionItem } from '../finance/components/TransactionItem';
import { TransactionDetailModal } from '../finance/components/TransactionDetailModal';
import { TaskReminderModal } from '../tasks/components/TaskReminderModal';
import { colors, ThemePalette, typography, borderRadius, spacing, shadows } from '../../theme';

const avatarSource = require('../../../assets/user_avatar.jpg');

const MONTH_SHORT_NAMES = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

type HomeScreenProps = {
  navigation: BottomTabNavigationProp<MainTabParamList, 'Home'>;
};

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const { user } = useAuthStore();
  const { palette, themeMode, setSettingsModalVisible } = useThemeStore();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const { tasks, loadTasks, toggleTask } = useTaskStore();
  const {
    transactions,
    summary,
    loadFinance,
    deleteTransaction,
    currency,
    selectedMonth,
    selectedYear,
    setSelectedPeriod,
    prevMonth,
    nextMonth,
    resetToCurrentMonth,
  } = useFinanceStore();
  const {
    profile,
    todayWater,
    loadFitness,
    incrementWater,
  } = useFitnessStore();
  const { goals, loadGoals } = useGoalStore();

  const [refreshing, setRefreshing] = useState(false);
  const [quickActionVisible, setQuickActionVisible] = useState(false);
  const [quickActionType, setQuickActionType] = useState<
    'task' | 'expense' | 'water' | null
  >(null);
  const [detailTransaction, setDetailTransaction] = useState<Transaction | null>(
    null
  );
  const [reminderTask, setReminderTask] = useState<Task | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      await Promise.allSettled([
        loadTasks(),
        loadFinance(),
        loadFitness(),
        loadGoals(),
      ]);
    } catch {
      // safe fallback
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const now = new Date();
  const isCurrentRealMonth =
    selectedMonth === now.getMonth() && selectedYear === now.getFullYear();

  const rawMonthName = new Date(selectedYear, selectedMonth, 1).toLocaleDateString(
    'es-ES',
    { month: 'long', year: 'numeric' }
  );
  const formattedMonthTitle =
    rawMonthName.charAt(0).toUpperCase() + rawMonthName.slice(1);

  const monthOnlyName = new Date(selectedYear, selectedMonth, 1).toLocaleDateString(
    'es-ES',
    { month: 'long' }
  );
  const capitalizedMonthOnly =
    monthOnlyName.charAt(0).toUpperCase() + monthOnlyName.slice(1);

  // Filter tasks corresponding to the selected month & year
  const monthTasks = useMemo(() => {
    return tasks.filter((t) => {
      const d = new Date(t.dueDate || t.createdAt);
      return (
        d.getFullYear() === selectedYear && d.getMonth() === selectedMonth
      );
    });
  }, [tasks, selectedMonth, selectedYear]);

  const pendingTasks = monthTasks.filter((t) => !t.completed);
  const completedTasks = monthTasks.filter((t) => t.completed);
  const taskProgress =
    monthTasks.length > 0
      ? Math.round((completedTasks.length / monthTasks.length) * 100)
      : 0;

  // Filter transactions corresponding to the selected month & year & active currency
  const monthTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if ((t.currency || 'PEN') !== currency) return false;
      const d = new Date(t.date);
      return (
        d.getFullYear() === selectedYear && d.getMonth() === selectedMonth
      );
    });
  }, [transactions, currency, selectedMonth, selectedYear]);

  const currencySymbol =
    currency === 'USD' ? '$' : currency === 'PEN' ? 'S/. ' : '€ ';

  const weightDelta = (profile.currentWeight - profile.targetWeight).toFixed(1);
  const weightProgress = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        (Math.abs(profile.initialWeight - profile.currentWeight) /
          Math.max(0.1, Math.abs(profile.initialWeight - profile.targetWeight))) *
        100
      )
    )
  );

  const openQuickAction = (type: 'task' | 'expense' | 'water') => {
    setQuickActionType(type);
    setQuickActionVisible(true);
  };

  const rawUserName = user?.name || '';
  const userDisplayName =
    rawUserName &&
    rawUserName.toLowerCase() !== 'dbueno' &&
    rawUserName !== 'Daniel Bueno'
      ? rawUserName
      : user
        ? 'Diego Bueno'
        : 'Invitado Demo';
  const userGreetingName = userDisplayName.split(' ')[0] || 'Invitado';
  const pendingTasksCount = pendingTasks.length;
  const productivityScore = monthTasks.length > 0 ? taskProgress : 100;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar style={palette.isDark ? 'light' : 'dark'} />

      {/* Top User Bar */}
      <View style={styles.topUserBar}>
        <TouchableOpacity
          style={styles.userProfileGroup}
          activeOpacity={0.75}
          onPress={() => setSettingsModalVisible(true)}
        >
          <View style={styles.avatarWrapper}>
            <Image
              source={avatarSource}
              style={styles.avatarImage}
              resizeMode="cover"
            />
            <View style={styles.onlineDot} />
          </View>

          <View style={styles.userInfoColumn}>
            <View style={styles.userNameRow}>
              <Text style={styles.userNameText}>{userDisplayName}</Text>
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
              <Ionicons
                name="create-outline"
                size={14}
                color={colors.textMuted}
                style={{ marginLeft: 4 }}
              />
            </View>

            <Text style={styles.rendimientoText}>
              Rendimiento ({MONTH_SHORT_NAMES[selectedMonth]}):{' '}
              <Text style={styles.rendimientoPercent}>{productivityScore}%</Text>
            </Text>
          </View>
        </TouchableOpacity>

        {/* Right Action Icons */}
        <View style={styles.topActionsRow}>
          <TouchableOpacity
            style={styles.circleActionButton}
            activeOpacity={0.7}
            onPress={() => {
              try {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {
                // fallback
              }
              setSettingsModalVisible(true);
            }}
          >
            <Ionicons
              name={
                themeMode === 'light'
                  ? 'sunny'
                  : themeMode === 'hybrid'
                    ? 'sparkles'
                    : 'moon'
              }
              size={18}
              color={colors.cyanLight}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.circleActionButton}
            activeOpacity={0.7}
            onPress={() => {
              setSettingsModalVisible(true);
            }}
          >
            <Ionicons name="options-outline" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.cyanLight}
            colors={[colors.cyan, colors.primary]}
          />
        }
      >
        {/* Active Month Selector Bar */}
        <View style={styles.monthSelectorCard}>
          <View style={styles.monthSelectorTopRow}>
            <View style={styles.monthTitleGroup}>
              <View style={styles.calendarIconCircle}>
                <Ionicons
                  name="calendar"
                  size={16}
                  color={colors.cyanLight}
                />
              </View>
              <View>
                <View style={styles.monthTitleBadgeRow}>
                  <Text style={styles.monthActiveTitle}>
                    {formattedMonthTitle}
                  </Text>
                  {isCurrentRealMonth ? (
                    <View style={styles.currentMonthBadge}>
                      <Text style={styles.currentMonthBadgeText}>
                        MES ACTUAL
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={resetToCurrentMonth}
                      style={styles.resetMonthBadge}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name="return-up-back"
                        size={11}
                        color={colors.cyanLight}
                      />
                      <Text style={styles.resetMonthBadgeText}>
                        Ir al mes actual
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text style={styles.monthSubtitleText}>
                  {monthTransactions.length}{' '}
                  {monthTransactions.length === 1
                    ? 'movimiento'
                    : 'movimientos'}{' '}
                  • {monthTasks.length}{' '}
                  {monthTasks.length === 1 ? 'tarea' : 'tareas'} en{' '}
                  {capitalizedMonthOnly}
                </Text>
              </View>
            </View>

            <View style={styles.monthArrowsGroup}>
              <TouchableOpacity
                onPress={prevMonth}
                style={styles.monthArrowBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons
                  name="chevron-back"
                  size={18}
                  color={colors.textPrimary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={nextMonth}
                style={styles.monthArrowBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textPrimary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Month Pills Strip */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.monthPillsStrip}
          >
            {MONTH_SHORT_NAMES.map((mLabel, idx) => {
              const isSelected = idx === selectedMonth;
              const isRealCurrent =
                idx === now.getMonth() && selectedYear === now.getFullYear();

              return (
                <TouchableOpacity
                  key={mLabel}
                  onPress={() => setSelectedPeriod(idx, selectedYear)}
                  style={[
                    styles.monthQuickPill,
                    isSelected && styles.monthQuickPillActive,
                    !isSelected &&
                    isRealCurrent &&
                    styles.monthQuickPillCurrentOutline,
                  ]}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.monthQuickPillText,
                      isSelected && styles.monthQuickPillTextActive,
                    ]}
                  >
                    {mLabel}
                  </Text>
                  {isRealCurrent && (
                    <View
                      style={[
                        styles.monthCurrentDot,
                        isSelected && { backgroundColor: '#FFF' },
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Executive Summary Card */}
        <LinearGradient
          colors={colors.gradients.executiveHero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.executiveCard}
        >
          <View style={styles.executiveTopRow}>
            <Text style={styles.executiveCategoryTag}>
              RESUMEN EJECUTIVO • {capitalizedMonthOnly.toUpperCase()}{' '}
              {selectedYear}
            </Text>
            <View style={styles.productivityWrapper}>
              <Text style={styles.productivityLabel}>Productividad</Text>
              <Text style={styles.productivityValue}>{productivityScore}%</Text>
            </View>
          </View>

          <Text style={styles.executiveGreeting}>
            ¡Hola, {userGreetingName}! 👋
          </Text>
          <Text style={styles.executivePendingSubtitle}>
            {pendingTasksCount > 0 ? (
              <>
                Tenés{' '}
                <Text style={styles.pendingHighlight}>
                  {pendingTasksCount}{' '}
                  {pendingTasksCount === 1 ? 'tarea pendiente' : 'tareas pendientes'}
                </Text>{' '}
                en {capitalizedMonthOnly}.
              </>
            ) : (
              <>
                No tenés tareas pendientes registradas en{' '}
                <Text style={styles.pendingHighlight}>
                  {capitalizedMonthOnly}
                </Text>
                .
              </>
            )}
          </Text>

          {/* Bottom: 3 Action Tiles (Tarea, Gasto, Ejercicio) */}
          <View style={styles.actionTilesRow}>
            <TouchableOpacity
              style={styles.actionTile}
              activeOpacity={0.8}
              onPress={() => openQuickAction('task')}
            >
              <View
                style={[
                  styles.tileIconContainer,
                  { backgroundColor: `${colors.primary}25` },
                ]}
              >
                <Ionicons name="add" size={18} color={colors.primaryLight} />
              </View>
              <Text style={styles.tileText}>Tarea</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionTile}
              activeOpacity={0.8}
              onPress={() => openQuickAction('expense')}
            >
              <View
                style={[
                  styles.tileIconContainer,
                  { backgroundColor: `${colors.mint}22` },
                ]}
              >
                <Ionicons name="receipt-outline" size={16} color={colors.mint} />
              </View>
              <Text style={styles.tileText}>Gasto</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionTile}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Fitness')}
            >
              <View
                style={[
                  styles.tileIconContainer,
                  { backgroundColor: `${colors.cyan}22` },
                ]}
              >
                <Ionicons name="barbell-outline" size={18} color={colors.cyan} />
              </View>
              <Text style={styles.tileText}>Ejercicio</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Hero Card: Financial Balance Overview for Selected Month */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => navigation.navigate('Finance')}
        >
          <LinearGradient
            colors={colors.gradients.financeHero}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroFinanceCard}
          >
            <View style={styles.heroTopRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.heroCaption}>
                  BALANCE FINANCIERO • {capitalizedMonthOnly.toUpperCase()}
                </Text>
                <Text style={styles.heroAmount}>
                  {currencySymbol}
                  {summary.totalBalance.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
                <Text style={styles.heroMonthSubNote}>
                  Flujo en {capitalizedMonthOnly}:{' '}
                  <Text
                    style={{
                      color:
                        summary.netSavings >= 0 ? colors.mint : colors.danger,
                      fontWeight: '700',
                    }}
                  >
                    {summary.netSavings >= 0 ? '+' : ''}
                    {currencySymbol}
                    {summary.netSavings.toFixed(2)}
                  </Text>{' '}
                  ({monthTransactions.length}{' '}
                  {monthTransactions.length === 1 ? 'mov.' : 'movs.'})
                </Text>
              </View>

              <View style={styles.heroBadge}>
                <Ionicons name="wallet" size={24} color={colors.cyanLight} />
              </View>
            </View>

            <View style={styles.heroStatsRow}>
              <View style={styles.statItem}>
                <View style={styles.statIndicatorIncome}>
                  <Ionicons
                    name="arrow-down-outline"
                    size={14}
                    color={colors.mint}
                  />
                </View>
                <View>
                  <Text style={styles.statLabel}>
                    Ingresos {MONTH_SHORT_NAMES[selectedMonth]}
                  </Text>
                  <Text style={styles.statValueIncome}>
                    +{currencySymbol}
                    {summary.monthlyIncome.toFixed(2)}
                  </Text>
                </View>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <View style={styles.statIndicatorExpense}>
                  <Ionicons
                    name="arrow-up-outline"
                    size={14}
                    color={colors.danger}
                  />
                </View>
                <View>
                  <Text style={styles.statLabel}>
                    Gastos {MONTH_SHORT_NAMES[selectedMonth]}
                  </Text>
                  <Text style={styles.statValueExpense}>
                    -{currencySymbol}
                    {summary.monthlyExpense.toFixed(2)}
                  </Text>
                </View>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <View style={styles.statIndicatorSavings}>
                  <Ionicons
                    name="sparkles-outline"
                    size={14}
                    color={colors.cyanLight}
                  />
                </View>
                <View>
                  <Text style={styles.statLabel}>
                    Neto {MONTH_SHORT_NAMES[selectedMonth]}
                  </Text>
                  <Text style={styles.statValueSavings}>
                    {summary.netSavings >= 0 ? '+' : ''}
                    {currencySymbol}
                    {summary.netSavings.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Movimientos Financieros del Mes Seleccionado */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Movimientos de {capitalizedMonthOnly} ({monthTransactions.length})
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Finance')}>
            <Text style={styles.seeAllText}>Ir a Finanzas</Text>
          </TouchableOpacity>
        </View>

        {monthTransactions.slice(0, 3).map((tx) => (
          <TransactionItem
            key={tx.id}
            transaction={tx}
            currency={currency}
            onDelete={deleteTransaction}
            onPress={(selected) => setDetailTransaction(selected)}
          />
        ))}

        {monthTransactions.length === 0 && (
          <GlassCard style={styles.emptyMonthCard}>
            <Ionicons
              name="receipt-outline"
              size={28}
              color={colors.textMuted}
            />
            <Text style={styles.emptyMonthCardText}>
              No hay ingresos ni gastos registrados en {capitalizedMonthOnly}{' '}
              {selectedYear}.
            </Text>
          </GlassCard>
        )}

        {/* 2-Column Grid: Tasks & Fitness */}
        <View style={[styles.gridRow, { marginTop: 12 }]}>
          {/* Tasks Summary for Selected Month */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Tasks')}
            style={styles.gridCard}
          >
            <GlassCard style={styles.innerCard}>
              <View style={styles.cardHeaderRow}>
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: 'rgba(79, 70, 229, 0.15)' },
                  ]}
                >
                  <Ionicons
                    name="checkbox"
                    size={20}
                    color={colors.primaryLight}
                  />
                </View>
                <Badge
                  label={`${pendingTasks.length} pendientes`}
                  color={pendingTasks.length > 0 ? colors.warning : colors.mint}
                />
              </View>

              <Text style={styles.cardTitle}>
                Tareas • {MONTH_SHORT_NAMES[selectedMonth]}
              </Text>
              <Text style={styles.cardValue}>{monthTasks.length} Tareas</Text>

              <ProgressBar
                progress={taskProgress}
                height={6}
                gradientColors={colors.gradients.primary}
                style={{ marginTop: 12 }}
              />
              <Text style={styles.progressNote}>
                {taskProgress}% completado en {capitalizedMonthOnly}
              </Text>
            </GlassCard>
          </TouchableOpacity>

          {/* Fitness & Weight Summary */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Fitness')}
            style={styles.gridCard}
          >
            <GlassCard style={styles.innerCard}>
              <View style={styles.cardHeaderRow}>
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
                  ]}
                >
                  <Ionicons name="scale" size={20} color={colors.mint} />
                </View>
                <Badge
                  label={`Meta: ${profile.targetWeight} ${profile.unit}`}
                  color={colors.mintLight}
                />
              </View>

              <Text style={styles.cardTitle}>Peso Actual</Text>
              <Text style={styles.cardValue}>
                {profile.currentWeight}{' '}
                <Text style={styles.unitText}>{profile.unit}</Text>
              </Text>

              <ProgressBar
                progress={weightProgress}
                height={6}
                gradientColors={colors.gradients.mintCyan}
                style={{ marginTop: 12 }}
              />
              <Text style={styles.progressNote}>
                {parseFloat(weightDelta) > 0
                  ? `Faltan ${weightDelta} ${profile.unit}`
                  : '¡Meta alcanzada!'}
              </Text>
            </GlassCard>
          </TouchableOpacity>
        </View>

        {/* Hydration Interactive Card */}
        <GlassCard style={styles.hydrationCard}>
          <View style={styles.hydrationLeft}>
            <LinearGradient
              colors={colors.gradients.water}
              style={styles.waterDrop}
            >
              <Ionicons name="water" size={24} color="#FFF" />
            </LinearGradient>
            <View style={styles.waterInfo}>
              <Text style={styles.waterTitle}>Hidratación Hoy</Text>
              <Text style={styles.waterSubtitle}>
                {todayWater.glasses} de {todayWater.targetGlasses} vasos (
                {todayWater.amountMl} ml)
              </Text>
              <ProgressBar
                progress={Math.round(
                  (todayWater.glasses / todayWater.targetGlasses) * 100
                )}
                height={6}
                gradientColors={colors.gradients.water}
                style={{ width: 160, marginTop: 6 }}
              />
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={async () => {
              await incrementWater();
              try {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              } catch {
                // fallback
              }
            }}
            style={styles.addWaterBtn}
          >
            <Ionicons name="add" size={22} color={colors.cyanLight} />
            <Text style={styles.addWaterText}>+250ml</Text>
          </TouchableOpacity>
        </GlassCard>

        {/* Tasks of the Selected Month */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Tareas de {capitalizedMonthOnly} ({monthTasks.length})
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Tasks')}>
            <Text style={styles.seeAllText}>Ver todas</Text>
          </TouchableOpacity>
        </View>

        {monthTasks.slice(0, 4).map((task) => {
          const dObj = new Date(task.alarmTime || task.dueDate);
          const fDate = dObj.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
          });
          const fTime = dObj.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });
          return (
            <GlassCard key={task.id} style={styles.taskItemCard}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => toggleTask(task.id)}
                style={styles.checkboxTouch}
              >
                <View
                  style={[
                    styles.checkbox,
                    task.completed && styles.checkboxCompleted,
                  ]}
                >
                  {task.completed && (
                    <Ionicons name="checkmark" size={14} color="#FFF" />
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setReminderTask(task)}
                style={styles.taskTextContent}
              >
                <Text
                  style={[
                    styles.taskTitleText,
                    task.completed && {
                      textDecorationLine: 'line-through',
                      color: colors.textMuted,
                    },
                  ]}
                >
                  {task.title}
                </Text>
                <View style={styles.taskMetaRow}>
                  <Badge
                    label={task.category}
                    color={colors.cyanLight}
                    style={{ marginRight: 8 }}
                  />
                  <Badge
                    label={task.priority}
                    color={
                      task.priority === 'Alta'
                        ? colors.danger
                        : task.priority === 'Media'
                          ? colors.warning
                          : colors.mint
                    }
                  />
                  <View style={styles.alarmBadge}>
                    <Ionicons
                      name={task.hasAlarm ? 'alarm' : 'calendar-outline'}
                      size={12}
                      color={
                        task.hasAlarm ? colors.cyanLight : colors.textMuted
                      }
                    />
                    <Text
                      style={[
                        styles.alarmText,
                        task.hasAlarm && { color: colors.cyanLight },
                      ]}
                    >
                      {fDate}
                      {task.hasAlarm ? ` • ${fTime}` : ' • + Recordatorio'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </GlassCard>
          );
        })}

        {monthTasks.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="checkmark-done-circle-outline"
              size={48}
              color={colors.mint}
            />
            <Text style={styles.emptyTitle}>
              Sin tareas en {capitalizedMonthOnly}
            </Text>
            <Text style={styles.emptySubtitle}>
              No hay tareas registradas para este mes.
            </Text>
          </View>
        )}

        {/* Goals Progress Preview */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>Metas en Marcha</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Goals')}>
            <Text style={styles.seeAllText}>Ver metas</Text>
          </TouchableOpacity>
        </View>

        {goals.slice(0, 2).map((goal) => (
          <GlassCard key={goal.id} style={styles.goalCard}>
            <View style={styles.goalTopRow}>
              <Text style={styles.goalTitle}>{goal.title}</Text>
              <Badge label={`${goal.progress}%`} color={colors.cyanLight} />
            </View>
            <ProgressBar
              progress={goal.progress}
              height={8}
              gradientColors={colors.gradients.mintCyan}
              style={{ marginTop: 10 }}
            />
            <Text style={styles.goalTermText}>
              Plazo: {goal.term} • {goal.category}
            </Text>
          </GlassCard>
        ))}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <FloatingActionButton
        onPress={() => {
          setQuickActionType(null);
          setQuickActionVisible(true);
        }}
        icon="flash"
      />

      {/* Quick Action Modal */}
      <QuickActionModal
        visible={quickActionVisible}
        initialAction={quickActionType}
        onClose={() => setQuickActionVisible(false)}
      />

      {/* Transaction Detail Modal from Home */}
      <TransactionDetailModal
        visible={!!detailTransaction}
        transaction={detailTransaction}
        onClose={() => setDetailTransaction(null)}
        onDelete={deleteTransaction}
        onOpenPersonAccount={() => {
          setDetailTransaction(null);
          navigation.navigate('Finance');
        }}
      />

      {/* Task Reminder Modal from Home */}
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
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    topUserBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingTop: 10,
      paddingBottom: 12,
    },
    userProfileGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    avatarWrapper: {
      width: 48,
      height: 48,
      position: 'relative',
    },
    avatarImage: {
      width: 48,
      height: 48,
      borderRadius: 24,
      borderWidth: 2,
      borderColor: `${colors.primaryLight}66`,
    },
    onlineDot: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 13,
      height: 13,
      borderRadius: 6.5,
      backgroundColor: colors.mint,
      borderWidth: 2.5,
      borderColor: colors.background,
    },
    userInfoColumn: {
      justifyContent: 'center',
    },
    userNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    userNameText: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.textPrimary,
      letterSpacing: -0.2,
    },
    proBadge: {
      backgroundColor: `${colors.primary}25`,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: `${colors.primaryLight}60`,
    },
    proBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: colors.primaryLight,
      letterSpacing: 0.5,
    },
    rendimientoText: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
      fontWeight: '500',
    },
    rendimientoPercent: {
      color: colors.mint,
      fontWeight: '700',
    },
    topActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    circleActionButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.surfaceGlassBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Active Month Selector Card
    monthSelectorCard: {
      backgroundColor: colors.surfaceCard,
      borderRadius: 18,
      padding: 12,
      borderWidth: 1,
      borderColor: `${colors.cyan}40`,
      marginBottom: 14,
    },
    monthSelectorTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    monthTitleGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    calendarIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: `${colors.cyan}20`,
      borderWidth: 1,
      borderColor: `${colors.cyan}45`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    monthTitleBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    monthActiveTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    currentMonthBadge: {
      backgroundColor: `${colors.mint}22`,
      borderWidth: 1,
      borderColor: `${colors.mint}55`,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: borderRadius.full,
    },
    currentMonthBadgeText: {
      fontSize: 9,
      fontWeight: '800',
      color: colors.mint,
      letterSpacing: 0.5,
    },
    resetMonthBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: `${colors.cyan}20`,
      borderWidth: 1,
      borderColor: `${colors.cyan}50`,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: borderRadius.full,
    },
    resetMonthBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.cyanLight,
    },
    monthSubtitleText: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 2,
    },
    monthArrowsGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    monthArrowBtn: {
      width: 32,
      height: 32,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    monthPillsStrip: {
      flexDirection: 'row',
      gap: 6,
      paddingTop: 2,
    },
    monthQuickPill: {
      paddingHorizontal: 11,
      paddingVertical: 5,
      borderRadius: borderRadius.full,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 4,
    },
    monthQuickPillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primaryLight,
    },
    monthQuickPillCurrentOutline: {
      borderColor: `${colors.mint}65`,
    },
    monthQuickPillText: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    monthQuickPillTextActive: {
      color: '#FFFFFF',
      fontWeight: '800',
    },
    monthCurrentDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.mint,
    },

    // Executive Summary Card
    executiveCard: {
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.isDark ? 'rgba(99, 102, 241, 0.25)' : '#BFDBFE',
      marginBottom: 18,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: colors.isDark ? 0.25 : 0.08,
      shadowRadius: 20,
      elevation: 8,
    },
    executiveTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    executiveCategoryTag: {
      color: colors.primaryLight,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1,
      textTransform: 'uppercase',
      flex: 1,
      marginRight: 8,
    },
    productivityWrapper: {
      alignItems: 'flex-end',
    },
    productivityLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '500',
    },
    productivityValue: {
      color: colors.mint,
      fontSize: 24,
      fontWeight: '800',
      marginTop: 2,
      letterSpacing: -0.5,
    },
    executiveGreeting: {
      color: colors.textPrimary,
      fontSize: 24,
      fontWeight: '800',
      marginTop: 8,
      letterSpacing: -0.4,
    },
    executivePendingSubtitle: {
      color: colors.textSecondary,
      fontSize: 14,
      marginTop: 4,
      marginBottom: 20,
      lineHeight: 20,
    },
    pendingHighlight: {
      color: colors.primaryLight,
      fontWeight: '700',
    },
    actionTilesRow: {
      flexDirection: 'row',
      gap: 12,
    },
    actionTile: {
      flex: 1,
      backgroundColor: colors.isDark
        ? 'rgba(10, 14, 30, 0.55)'
        : colors.surface,
      borderRadius: 16,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.isDark
        ? 'rgba(255, 255, 255, 0.08)'
        : colors.border,
    },
    tileIconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    tileText: {
      color: colors.textPrimary,
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: 0.2,
    },
    heroFinanceCard: {
      borderRadius: borderRadius.xl,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.isDark ? 'rgba(79, 70, 229, 0.3)' : '#BAE6FD',
      marginBottom: 16,
      ...shadows.glass,
      shadowOpacity: colors.isDark ? 0.35 : 0.08,
    },
    heroTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    heroCaption: {
      ...typography.caption,
      color: colors.cyanLight,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      fontWeight: '700',
    },
    heroAmount: {
      fontSize: 32,
      fontWeight: '800',
      color: colors.textPrimary,
      marginTop: 4,
    },
    heroMonthSubNote: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
    heroBadge: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: `${colors.cyan}18`,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: `${colors.cyan}40`,
    },
    heroStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    statItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statIndicatorIncome: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: `${colors.mint}22`,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 6,
    },
    statIndicatorExpense: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: `${colors.danger}22`,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 6,
    },
    statIndicatorSavings: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: `${colors.cyan}22`,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 6,
    },
    statLabel: {
      ...typography.caption,
      fontSize: 10,
      color: colors.textMuted,
    },
    statValueIncome: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '700',
      color: colors.mint,
    },
    statValueExpense: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '700',
      color: colors.danger,
    },
    statValueSavings: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '700',
      color: colors.cyanLight,
    },
    statDivider: {
      width: 1,
      height: 24,
      backgroundColor: colors.divider,
    },
    emptyMonthCard: {
      padding: 16,
      alignItems: 'center',
      marginBottom: 12,
      flexDirection: 'row',
      gap: 10,
    },
    emptyMonthCardText: {
      fontSize: 12,
      color: colors.textMuted,
      flex: 1,
    },
    gridRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    gridCard: {
      flex: 1,
    },
    innerCard: {
      padding: 14,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    iconBox: {
      width: 34,
      height: 34,
      borderRadius: borderRadius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardTitle: {
      ...typography.caption,
      color: colors.textMuted,
      textTransform: 'uppercase',
    },
    cardValue: {
      ...typography.h2,
      color: colors.textPrimary,
      fontSize: 20,
      marginTop: 2,
    },
    unitText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '400',
    },
    progressNote: {
      ...typography.caption,
      color: colors.textMuted,
      fontSize: 10,
      marginTop: 6,
    },
    hydrationCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
      marginBottom: 20,
    },
    hydrationLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    waterDrop: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    waterInfo: {},
    waterTitle: {
      ...typography.body,
      color: colors.textPrimary,
      fontWeight: '700',
    },
    waterSubtitle: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: 2,
    },
    addWaterBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: `${colors.cyan}18`,
      borderWidth: 1,
      borderColor: `${colors.cyan}40`,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: borderRadius.md,
    },
    addWaterText: {
      ...typography.caption,
      color: colors.cyanLight,
      fontWeight: '700',
      marginLeft: 4,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      ...typography.h3,
      color: colors.textPrimary,
      fontSize: 16,
    },
    seeAllText: {
      ...typography.caption,
      color: colors.cyanLight,
      fontWeight: '600',
    },
    taskItemCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      marginBottom: 10,
    },
    checkboxTouch: {
      padding: 4,
      marginRight: 10,
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
    checkboxCompleted: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    taskTextContent: {
      flex: 1,
    },
    taskTitleText: {
      ...typography.body,
      color: colors.textPrimary,
      fontWeight: '600',
      marginBottom: 4,
    },
    taskMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    alarmBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 8,
    },
    alarmText: {
      ...typography.caption,
      fontSize: 10,
      color: colors.primaryLight,
      marginLeft: 3,
    },
    goalCard: {
      padding: 14,
      marginBottom: 10,
    },
    goalTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    goalTitle: {
      ...typography.body,
      color: colors.textPrimary,
      fontWeight: '600',
    },
    goalTermText: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: 6,
    },
    emptyContainer: {
      alignItems: 'center',
      paddingVertical: 20,
    },
    emptyTitle: {
      ...typography.body,
      color: colors.textPrimary,
      fontWeight: '700',
      marginTop: 8,
    },
    emptySubtitle: {
      ...typography.caption,
      color: colors.textMuted,
      marginTop: 2,
    },
  });

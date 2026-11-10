import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ModalContainer, CustomButton } from '../../../components/common';
import {
  useThemeStore,
  THEME_PALETTES,
} from '../../../store/useThemeStore';
import { ThemeMode, borderRadius, typography } from '../../../theme';
import { useAuthStore } from '../../../store/useAuthStore';
import { useFinanceStore } from '../../../store/useFinanceStore';
import { useFitnessStore } from '../../../store/useFitnessStore';
import { useTaskStore } from '../../../store/useTaskStore';
import { useGoalStore } from '../../../store/useGoalStore';
import { clearAllUserData } from '../../../services/db/sqlite';

const avatarSource = require('../../../../assets/user_avatar.jpg');

interface ThemeOptionMeta {
  mode: ThemeMode;
  title: string;
  tag: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  swatches: [string, string, string, string];
  previewBg: string;
  previewCard: string;
  previewText: string;
  previewAccent: string;
}

const THEME_OPTIONS: ThemeOptionMeta[] = [
  {
    mode: 'dark',
    title: 'Modo Oscuro',
    tag: 'Actual • Nocturno',
    description:
      'Diseño oscuro elegante de alto contraste con tonos pizarra, índigo y cian.',
    icon: 'moon',
    swatches: ['#0F172A', '#1E293B', '#4F46E5', '#22D3EE'],
    previewBg: '#0F172A',
    previewCard: '#1E293B',
    previewText: '#F8FAFC',
    previewAccent: '#22D3EE',
  },
  {
    mode: 'light',
    title: 'Modo Claro',
    tag: 'Formal • Legible',
    description:
      'Tono claro, amigable, de máxima legibilidad y carácter formal ejecutivo.',
    icon: 'sunny',
    swatches: ['#F1F5F9', '#FFFFFF', '#1D4ED8', '#059669'],
    previewBg: '#F1F5F9',
    previewCard: '#FFFFFF',
    previewText: '#0F172A',
    previewAccent: '#1D4ED8',
  },
  {
    mode: 'hybrid',
    title: 'Modo Híbrido',
    tag: 'Juvenil • Vibrante',
    description:
      'Estilo juvenil y energético con base violeta cósmica, neón rosa y turquesa.',
    icon: 'sparkles',
    swatches: ['#170F2E', '#352266', '#EC4899', '#2DD4BF'],
    previewBg: '#170F2E',
    previewCard: '#251848',
    previewText: '#FDF4FF',
    previewAccent: '#F472B6',
  },
];

export const SettingsModal: React.FC = () => {
  const {
    themeMode,
    palette,
    settingsModalVisible,
    setThemeMode,
    setSettingsModalVisible,
  } = useThemeStore();
  const { user, updateUserProfile, logout } = useAuthStore();
  const { currency, setCurrency, loadFinance } = useFinanceStore();
  const { loadTasks } = useTaskStore();
  const { loadGoals } = useGoalStore();
  const {
    profile,
    todayWater,
    loadFitness,
    updateProfile: updateFitnessProfile,
    setTargetGlasses,
    toggleHydrationReminder,
  } = useFitnessStore();
  const [dataClearedBanner, setDataClearedBanner] = useState(false);

  // Profile Edit State
  const resolvedDisplayName =
    user?.name &&
      user.name.toLowerCase() !== 'dbueno' &&
      user.name !== 'Daniel Bueno'
      ? user.name
      : user
        ? 'Diego Bueno'
        : 'Invitado Demo';

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(resolvedDisplayName);
  const [profileUsername, setProfileUsername] = useState(
    user?.username || 'dbueno'
  );
  const [profileEmail, setProfileEmail] = useState(
    user?.email || 'dbueno@aio.app'
  );
  const [profileSavedBanner, setProfileSavedBanner] = useState(false);

  // Fitness Configuration State
  const [isEditingFitness, setIsEditingFitness] = useState(false);
  const [currentWeightStr, setCurrentWeightStr] = useState(
    String(profile.currentWeight)
  );
  const [targetWeightStr, setTargetWeightStr] = useState(
    String(profile.targetWeight)
  );
  const [initialWeightStr, setInitialWeightStr] = useState(
    String(profile.initialWeight)
  );
  const [heightStr, setHeightStr] = useState(String(profile.height));
  const [waterGoalGlasses, setWaterGoalGlasses] = useState(
    todayWater.targetGlasses || 8
  );
  const [reminderHours, setReminderHours] = useState(
    profile.hydrationReminderIntervalHours || 2
  );
  const [fitnessSavedBanner, setFitnessSavedBanner] = useState(false);

  useEffect(() => {
    if (settingsModalVisible) {
      const currentAuthUser = useAuthStore.getState().user;
      const display =
        currentAuthUser?.name &&
          currentAuthUser.name.toLowerCase() !== 'dbueno' &&
          currentAuthUser.name !== 'Daniel Bueno'
          ? currentAuthUser.name
          : currentAuthUser
            ? 'Diego Bueno'
            : 'Invitado Demo';
      setProfileName(display);
      setProfileUsername(currentAuthUser?.username || 'dbueno');
      setProfileEmail(currentAuthUser?.email || 'dbueno@aio.app');

      const currentFitness = useFitnessStore.getState().profile;
      const currentWater = useFitnessStore.getState().todayWater;
      setCurrentWeightStr(String(currentFitness.currentWeight));
      setTargetWeightStr(String(currentFitness.targetWeight));
      setInitialWeightStr(String(currentFitness.initialWeight));
      setHeightStr(String(currentFitness.height));
      setWaterGoalGlasses(currentWater.targetGlasses || 8);
      setReminderHours(currentFitness.hydrationReminderIntervalHours || 2);
      setProfileSavedBanner(false);
      setFitnessSavedBanner(false);
    }
  }, [settingsModalVisible]);

  const handleSelectTheme = async (mode: ThemeMode) => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // ignore
    }
    setThemeMode(mode);
  };

  const handleSaveProfile = async () => {
    if (!profileName.trim()) return;
    await updateUserProfile({
      name: profileName.trim(),
      username: profileUsername.trim(),
      email: profileEmail.trim(),
    });
    setIsEditingProfile(false);
    setProfileSavedBanner(true);
    setTimeout(() => setProfileSavedBanner(false), 2600);
  };

  const handleSaveFitnessConfig = async () => {
    const cw = parseFloat(currentWeightStr);
    const tw = parseFloat(targetWeightStr);
    const iw = parseFloat(initialWeightStr);
    const h = parseFloat(heightStr);

    await updateFitnessProfile({
      currentWeight: !isNaN(cw) && cw > 0 ? cw : profile.currentWeight,
      targetWeight: !isNaN(tw) && tw > 0 ? tw : profile.targetWeight,
      initialWeight: !isNaN(iw) && iw > 0 ? iw : profile.initialWeight,
      height: !isNaN(h) && h > 0 ? h : profile.height,
      hydrationReminderIntervalHours: reminderHours,
    });

    await setTargetGlasses(Math.max(1, waterGoalGlasses));
    if (profile.hydrationReminderEnabled) {
      await toggleHydrationReminder(true, reminderHours);
    }

    setIsEditingFitness(false);
    setFitnessSavedBanner(true);
    setTimeout(() => setFitnessSavedBanner(false), 2600);
  };

  // Live BMI Calculation
  const parsedWeight = parseFloat(currentWeightStr) || profile.currentWeight;
  const parsedHeightM =
    (parseFloat(heightStr) || profile.height || 175) / 100;
  const bmi =
    parsedHeightM > 0
      ? (parsedWeight / (parsedHeightM * parsedHeightM)).toFixed(1)
      : '24.0';

  const handleClose = async () => {
    // Auto-save any unsaved profile edits if the user edited the fields and pressed "Listo"
    if (
      profileName.trim() &&
      (isEditingProfile || profileName.trim() !== resolvedDisplayName)
    ) {
      await updateUserProfile({
        name: profileName.trim(),
        username: profileUsername.trim(),
        email: profileEmail.trim(),
      });
      setIsEditingProfile(false);
    }

    // Auto-save any unsaved fitness edits if the fitness panel is open
    if (isEditingFitness) {
      await handleSaveFitnessConfig();
    }

    setSettingsModalVisible(false);
  };

  return (
    <ModalContainer
      visible={settingsModalVisible}
      onClose={handleClose}
      title="Configuración y Perfil"
      subtitle="Personaliza tu perfil, metas de fitness, tema visual y moneda"
      footer={
        <CustomButton
          title="Listo"
          onPress={handleClose}
          variant="primary"
          icon={
            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color="#FFF"
            />
          }
        />
      }
    >
      {/* 1. USER PROFILE SECTION */}
      <View style={styles.sectionHeaderRow}>
        <Ionicons name="person-circle-outline" size={19} color={palette.cyanLight} />
        <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
          Perfil Personal
        </Text>
      </View>

      <View
        style={[
          styles.userCard,
          {
            backgroundColor: palette.surfaceLight,
            borderColor: isEditingProfile ? palette.cyanLight : palette.border,
          },
        ]}
      >
        <View style={styles.userCardTopRow}>
          <Image source={avatarSource} style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <View style={styles.userNameRow}>
              <Text style={[styles.userName, { color: palette.textPrimary }]}>
                {resolvedDisplayName}
              </Text>
              <View
                style={[
                  styles.proPill,
                  {
                    backgroundColor: `${palette.primary}25`,
                    borderColor: palette.primaryLight,
                  },
                ]}
              >
                <Text style={[styles.proPillText, { color: palette.primaryLight }]}>
                  PRO
                </Text>
              </View>
            </View>
            <Text style={[styles.userEmail, { color: palette.textSecondary }]}>
              @{user?.username || 'dbueno'} • {user?.email || 'dbueno@aio.app'}
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setIsEditingProfile((prev) => !prev)}
            style={[
              styles.editToggleBtn,
              {
                backgroundColor: isEditingProfile
                  ? `${palette.cyanLight}22`
                  : palette.surface,
                borderColor: isEditingProfile
                  ? palette.cyanLight
                  : palette.border,
              },
            ]}
          >
            <Ionicons
              name={isEditingProfile ? 'close-outline' : 'create-outline'}
              size={15}
              color={isEditingProfile ? palette.cyanLight : palette.textPrimary}
            />
            <Text
              style={[
                styles.editToggleBtnText,
                {
                  color: isEditingProfile
                    ? palette.cyanLight
                    : palette.textPrimary,
                },
              ]}
            >
              {isEditingProfile ? 'Cerrar' : 'Editar Perfil'}
            </Text>
          </TouchableOpacity>
        </View>

        {profileSavedBanner && (
          <View
            style={[
              styles.savedBanner,
              {
                backgroundColor: `${palette.mint}20`,
                borderColor: `${palette.mint}50`,
              },
            ]}
          >
            <Ionicons name="checkmark-circle" size={16} color={palette.mint} />
            <Text style={[styles.savedBannerText, { color: palette.mint }]}>
              ¡Tu nombre y perfil se actualizaron correctamente!
            </Text>
          </View>
        )}

        {isEditingProfile && (
          <View
            style={[
              styles.editFormContainer,
              { borderTopColor: palette.border },
            ]}
          >
            <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>
              NOMBRE COMPLETO (VISIBLE EN EL HOME Y SALUDO)
            </Text>
            <View
              style={[
                styles.inputBox,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}
            >
              <Ionicons
                name="person-outline"
                size={16}
                color={palette.cyanLight}
              />
              <TextInput
                style={[styles.textInput, { color: palette.textPrimary }]}
                value={profileName}
                onChangeText={setProfileName}
                placeholder="Ej. Diego Bueno"
                placeholderTextColor={palette.textMuted}
              />
            </View>

            <View style={styles.twoColRow}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.inputLabel, { color: palette.textSecondary }]}
                >
                  USUARIO (@)
                </Text>
                <View
                  style={[
                    styles.inputBox,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="at-outline"
                    size={16}
                    color={palette.textMuted}
                  />
                  <TextInput
                    style={[styles.textInput, { color: palette.textPrimary }]}
                    value={profileUsername}
                    onChangeText={setProfileUsername}
                    autoCapitalize="none"
                    placeholder="dbueno"
                    placeholderTextColor={palette.textMuted}
                  />
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.inputLabel, { color: palette.textSecondary }]}
                >
                  CORREO
                </Text>
                <View
                  style={[
                    styles.inputBox,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="mail-outline"
                    size={16}
                    color={palette.textMuted}
                  />
                  <TextInput
                    style={[styles.textInput, { color: palette.textPrimary }]}
                    value={profileEmail}
                    onChangeText={setProfileEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="correo@aio.app"
                    placeholderTextColor={palette.textMuted}
                  />
                </View>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSaveProfile}
              style={[
                styles.saveSectionBtn,
                { backgroundColor: palette.primary },
              ]}
            >
              <Ionicons name="save-outline" size={16} color="#FFFFFF" />
              <Text style={styles.saveSectionBtnText}>
                Guardar Cambios del Perfil
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 2. FITNESS CONFIGURATION SECTION */}
      <View style={styles.sectionHeaderRow}>
        <Ionicons name="fitness-outline" size={19} color={palette.mint} />
        <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
          Configuración de Fitness y Bienestar
        </Text>
      </View>
      <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>
        Personaliza tus metas de peso, estatura e hidratación diaria:
      </Text>

      <View
        style={[
          styles.fitnessConfigCard,
          {
            backgroundColor: palette.surfaceLight,
            borderColor: isEditingFitness ? palette.mint : palette.border,
          },
        ]}
      >
        {/* Summary Metrics Strip */}
        <View style={styles.fitnessSummaryRow}>
          <View style={styles.fitnessStatItem}>
            <Text style={[styles.fitnessStatLabel, { color: palette.textMuted }]}>
              PESO ACTUAL
            </Text>
            <Text style={[styles.fitnessStatVal, { color: palette.textPrimary }]}>
              {profile.currentWeight} kg
            </Text>
          </View>

          <View
            style={[
              styles.fitnessStatDivider,
              { backgroundColor: palette.border },
            ]}
          />

          <View style={styles.fitnessStatItem}>
            <Text style={[styles.fitnessStatLabel, { color: palette.textMuted }]}>
              PESO META
            </Text>
            <Text style={[styles.fitnessStatVal, { color: palette.mint }]}>
              {profile.targetWeight} kg
            </Text>
          </View>

          <View
            style={[
              styles.fitnessStatDivider,
              { backgroundColor: palette.border },
            ]}
          />

          <View style={styles.fitnessStatItem}>
            <Text style={[styles.fitnessStatLabel, { color: palette.textMuted }]}>
              META AGUA
            </Text>
            <Text style={[styles.fitnessStatVal, { color: palette.cyanLight }]}>
              {todayWater.targetGlasses} vasos
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setIsEditingFitness((prev) => !prev)}
            style={[
              styles.editToggleBtn,
              {
                backgroundColor: isEditingFitness
                  ? `${palette.mint}22`
                  : palette.surface,
                borderColor: isEditingFitness ? palette.mint : palette.border,
              },
            ]}
          >
            <Ionicons
              name={isEditingFitness ? 'chevron-up' : 'options-outline'}
              size={15}
              color={isEditingFitness ? palette.mint : palette.textPrimary}
            />
            <Text
              style={[
                styles.editToggleBtnText,
                {
                  color: isEditingFitness ? palette.mint : palette.textPrimary,
                },
              ]}
            >
              {isEditingFitness ? 'Ocultar' : 'Configurar'}
            </Text>
          </TouchableOpacity>
        </View>

        {fitnessSavedBanner && (
          <View
            style={[
              styles.savedBanner,
              {
                backgroundColor: `${palette.mint}20`,
                borderColor: `${palette.mint}50`,
                marginTop: 10,
              },
            ]}
          >
            <Ionicons name="checkmark-circle" size={16} color={palette.mint} />
            <Text style={[styles.savedBannerText, { color: palette.mint }]}>
              ¡Configuración de Fitness actualizada en toda la app!
            </Text>
          </View>
        )}

        {isEditingFitness && (
          <View
            style={[
              styles.editFormContainer,
              { borderTopColor: palette.border },
            ]}
          >
            {/* Row 1: Current Weight & Target Weight */}
            <View style={styles.twoColRow}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.inputLabel, { color: palette.textSecondary }]}
                >
                  PESO ACTUAL (KG)
                </Text>
                <View
                  style={[
                    styles.inputBox,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="scale-outline"
                    size={16}
                    color={palette.cyanLight}
                  />
                  <TextInput
                    style={[styles.textInput, { color: palette.textPrimary }]}
                    value={currentWeightStr}
                    onChangeText={setCurrentWeightStr}
                    keyboardType="decimal-pad"
                    placeholder="74.5"
                    placeholderTextColor={palette.textMuted}
                  />
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.inputLabel, { color: palette.textSecondary }]}
                >
                  PESO META (KG)
                </Text>
                <View
                  style={[
                    styles.inputBox,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="flag-outline"
                    size={16}
                    color={palette.mint}
                  />
                  <TextInput
                    style={[styles.textInput, { color: palette.textPrimary }]}
                    value={targetWeightStr}
                    onChangeText={setTargetWeightStr}
                    keyboardType="decimal-pad"
                    placeholder="68.0"
                    placeholderTextColor={palette.textMuted}
                  />
                </View>
              </View>
            </View>

            {/* Row 2: Initial Weight & Height + Live BMI */}
            <View style={styles.twoColRow}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.inputLabel, { color: palette.textSecondary }]}
                >
                  PESO INICIAL (KG)
                </Text>
                <View
                  style={[
                    styles.inputBox,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="analytics-outline"
                    size={16}
                    color={palette.textMuted}
                  />
                  <TextInput
                    style={[styles.textInput, { color: palette.textPrimary }]}
                    value={initialWeightStr}
                    onChangeText={setInitialWeightStr}
                    keyboardType="decimal-pad"
                    placeholder="78.0"
                    placeholderTextColor={palette.textMuted}
                  />
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.inputLabel, { color: palette.textSecondary }]}
                >
                  ESTATURA (CM) • IMC {bmi}
                </Text>
                <View
                  style={[
                    styles.inputBox,
                    {
                      backgroundColor: palette.surface,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="body-outline"
                    size={16}
                    color={palette.primaryLight}
                  />
                  <TextInput
                    style={[styles.textInput, { color: palette.textPrimary }]}
                    value={heightStr}
                    onChangeText={setHeightStr}
                    keyboardType="decimal-pad"
                    placeholder="175"
                    placeholderTextColor={palette.textMuted}
                  />
                </View>
              </View>
            </View>

            {/* Row 3: Daily Water Goal Stepper */}
            <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>
              META DIARIA DE HIDRATACIÓN ({waterGoalGlasses} VASOS ={' '}
              {waterGoalGlasses * 250} ML)
            </Text>
            <View
              style={[
                styles.waterStepperBox,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}
            >
              <TouchableOpacity
                onPress={() =>
                  setWaterGoalGlasses((g) => Math.max(4, g - 1))
                }
                style={[
                  styles.waterStepBtn,
                  { backgroundColor: palette.surfaceLight },
                ]}
              >
                <Ionicons name="remove" size={18} color={palette.textPrimary} />
              </TouchableOpacity>

              <View style={styles.waterStepCenter}>
                <Ionicons name="water" size={16} color={palette.cyanLight} />
                <Text
                  style={[styles.waterStepValue, { color: palette.textPrimary }]}
                >
                  {waterGoalGlasses} vasos / día
                </Text>
                <Text
                  style={[styles.waterStepMl, { color: palette.textSecondary }]}
                >
                  ({(waterGoalGlasses * 0.25).toFixed(2)} L)
                </Text>
              </View>

              <TouchableOpacity
                onPress={() =>
                  setWaterGoalGlasses((g) => Math.min(20, g + 1))
                }
                style={[
                  styles.waterStepBtn,
                  { backgroundColor: palette.surfaceLight },
                ]}
              >
                <Ionicons name="add" size={18} color={palette.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* Row 4: Hydration Reminder Frequency */}
            <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>
              FRECUENCIA DE ALERTA DE HIDRATACIÓN
            </Text>
            <View style={styles.reminderChipsRow}>
              {[1, 2, 3, 4].map((hrs) => {
                const selected = reminderHours === hrs;
                return (
                  <TouchableOpacity
                    key={hrs}
                    onPress={() => setReminderHours(hrs)}
                    style={[
                      styles.reminderChip,
                      {
                        backgroundColor: selected
                          ? `${palette.cyanLight}22`
                          : palette.surface,
                        borderColor: selected
                          ? palette.cyanLight
                          : palette.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.reminderChipText,
                        {
                          color: selected
                            ? palette.cyanLight
                            : palette.textSecondary,
                          fontWeight: selected ? '700' : '600',
                        },
                      ]}
                    >
                      Cada {hrs}h
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleSaveFitnessConfig}
              style={[
                styles.saveSectionBtn,
                { backgroundColor: palette.mint },
              ]}
            >
              <Ionicons name="checkmark-circle-outline" size={17} color="#FFFFFF" />
              <Text style={styles.saveSectionBtnText}>
                Guardar Metas de Fitness
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 3. THEME SELECTOR SECTION */}
      <View style={styles.sectionHeaderRow}>
        <Ionicons
          name="color-palette-outline"
          size={18}
          color={palette.cyanLight}
        />
        <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
          Tema de la Aplicación (3 Modos)
        </Text>
      </View>
      <Text style={[styles.sectionSubtitle, { color: palette.textSecondary }]}>
        Elige el estilo visual que mejor se adapte a tu entorno:
      </Text>

      <View style={styles.themesList}>
        {THEME_OPTIONS.map((opt) => {
          const isSelected = themeMode === opt.mode;
          const optPalette = THEME_PALETTES[opt.mode];

          return (
            <TouchableOpacity
              key={opt.mode}
              activeOpacity={0.85}
              onPress={() => handleSelectTheme(opt.mode)}
              style={[
                styles.themeOptionCard,
                {
                  backgroundColor: palette.surfaceCard,
                  borderColor: isSelected ? palette.cyanLight : palette.border,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
            >
              <View style={styles.themeTopRow}>
                <View style={styles.themeTitleGroup}>
                  <LinearGradient
                    colors={optPalette.gradients.primary}
                    style={styles.themeIconCircle}
                  >
                    <Ionicons name={opt.icon} size={18} color="#FFFFFF" />
                  </LinearGradient>

                  <View style={{ flex: 1 }}>
                    <View style={styles.themeNameRow}>
                      <Text
                        style={[
                          styles.themeTitleText,
                          { color: palette.textPrimary },
                        ]}
                      >
                        {opt.title}
                      </Text>
                      <View
                        style={[
                          styles.themeTagPill,
                          {
                            backgroundColor: isSelected
                              ? `${palette.cyanLight}22`
                              : palette.surfaceLight,
                            borderColor: isSelected
                              ? palette.cyanLight
                              : palette.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.themeTagText,
                            {
                              color: isSelected
                                ? palette.cyanLight
                                : palette.textSecondary,
                            },
                          ]}
                        >
                          {opt.tag}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.themeDescText,
                        { color: palette.textSecondary },
                      ]}
                    >
                      {opt.description}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.radioOuter,
                    {
                      borderColor: isSelected
                        ? palette.cyanLight
                        : palette.textMuted,
                    },
                  ]}
                >
                  {isSelected && (
                    <View
                      style={[
                        styles.radioInner,
                        { backgroundColor: palette.cyanLight },
                      ]}
                    />
                  )}
                </View>
              </View>

              {/* Mini Visual Preview Card */}
              <View
                style={[
                  styles.miniPreviewContainer,
                  {
                    backgroundColor: opt.previewBg,
                    borderColor: optPalette.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.miniPreviewInnerCard,
                    {
                      backgroundColor: opt.previewCard,
                      borderColor: optPalette.surfaceGlassBorder,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.miniPreviewBadge,
                      { backgroundColor: `${opt.previewAccent}25` },
                    ]}
                  >
                    <View
                      style={[
                        styles.miniPreviewDot,
                        { backgroundColor: opt.previewAccent },
                      ]}
                    />
                    <Text
                      style={[
                        styles.miniPreviewBadgeText,
                        { color: opt.previewAccent },
                      ]}
                    >
                      Vista previa
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.miniPreviewSampleText,
                      { color: opt.previewText },
                    ]}
                  >
                    S/. 1,899.40
                  </Text>
                </View>

                <View style={styles.swatchesGroup}>
                  {opt.swatches.map((hex, i) => (
                    <View
                      key={i}
                      style={[
                        styles.swatchCircle,
                        {
                          backgroundColor: hex,
                          borderColor:
                            opt.mode === 'light'
                              ? '#94A3B8'
                              : 'rgba(255,255,255,0.25)',
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 4. CURRENCY QUICK PREFERENCE */}
      <View style={[styles.sectionHeaderRow, { marginTop: 18 }]}>
        <Ionicons name="cash-outline" size={18} color={palette.cyanLight} />
        <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
          Moneda Principal
        </Text>
      </View>
      <View style={styles.currencyRow}>
        {(['PEN', 'USD', 'EUR'] as const).map((code) => {
          const active = currency === code;
          const label =
            code === 'PEN'
              ? 'Soles (S/.)'
              : code === 'USD'
                ? 'Dólares ($)'
                : 'Euros (€)';
          return (
            <TouchableOpacity
              key={code}
              activeOpacity={0.8}
              onPress={() => setCurrency(code)}
              style={[
                styles.currencyBtn,
                {
                  backgroundColor: active
                    ? `${palette.primary}20`
                    : palette.surfaceLight,
                  borderColor: active ? palette.primaryLight : palette.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.currencyBtnText,
                  {
                    color: active
                      ? palette.primaryLight
                      : palette.textSecondary,
                    fontWeight: active ? '700' : '600',
                  },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Reset / Clear Data to Zero Button */}
      {dataClearedBanner && (
        <View
          style={[
            styles.savedBanner,
            {
              backgroundColor: `${palette.mint}20`,
              borderColor: `${palette.mint}50`,
              marginBottom: 10,
            },
          ]}
        >
          <Ionicons name="checkmark-circle" size={16} color={palette.mint} />
          <Text style={[styles.savedBannerText, { color: palette.mint }]}>
            ¡Todos los registros fueron limpiados en cero!
          </Text>
        </View>
      )}

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={async () => {
          await clearAllUserData();
          await Promise.all([
            loadTasks(),
            loadFinance(),
            loadGoals(),
            loadFitness(),
          ]);
          setDataClearedBanner(true);
          setTimeout(() => setDataClearedBanner(false), 3000);
        }}
        style={[
          styles.logoutBtn,
          {
            backgroundColor: palette.surfaceLight,
            borderColor: palette.border,
            marginBottom: 10,
          },
        ]}
      >
        <Ionicons name="refresh-outline" size={18} color={palette.textSecondary} />
        <Text style={[styles.logoutBtnText, { color: palette.textSecondary, fontSize: 13 }]}>
          Dejar registros en cero (Limpiar Tareas, Finanzas y Metas)
        </Text>
      </TouchableOpacity>

      {/* Logout Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => {
          setSettingsModalVisible(false);
          logout();
        }}
        style={[
          styles.logoutBtn,
          {
            backgroundColor: `${palette.danger}15`,
            borderColor: `${palette.danger}45`,
          },
        ]}
      >
        <Ionicons name="log-out-outline" size={18} color={palette.danger} />
        <Text style={[styles.logoutBtnText, { color: palette.danger }]}>
          Cerrar Sesión
        </Text>
      </TouchableOpacity>
    </ModalContainer>
  );
};

const styles = StyleSheet.create({
  userCard: {
    padding: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: 18,
    marginTop: 6,
  },
  userCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    ...typography.body,
    fontWeight: '700',
    fontSize: 15,
  },
  proPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  proPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  userEmail: {
    ...typography.caption,
    marginTop: 2,
  },
  editToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  editToggleBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  savedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  savedBannerText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  editFormContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 10,
    height: 40,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    paddingVertical: 0,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 10,
  },
  saveSectionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: borderRadius.sm,
    marginTop: 4,
  },
  saveSectionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  fitnessConfigCard: {
    padding: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: 18,
  },
  fitnessSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fitnessStatItem: {
    flex: 1,
  },
  fitnessStatLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  fitnessStatVal: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  fitnessStatDivider: {
    width: 1,
    height: 26,
    marginHorizontal: 8,
  },
  waterStepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    padding: 6,
  },
  waterStepBtn: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterStepCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  waterStepValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  waterStepMl: {
    fontSize: 12,
    fontWeight: '600',
  },
  reminderChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  reminderChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  reminderChipText: {
    fontSize: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sectionTitle: {
    ...typography.body,
    fontWeight: '700',
    fontSize: 15,
  },
  sectionSubtitle: {
    ...typography.caption,
    marginBottom: 10,
  },
  themesList: {
    gap: 12,
  },
  themeOptionCard: {
    borderRadius: borderRadius.lg,
    padding: 14,
  },
  themeTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  themeTitleGroup: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 10,
  },
  themeIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  themeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  themeTitleText: {
    ...typography.body,
    fontWeight: '700',
    fontSize: 15,
  },
  themeTagPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  themeTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  themeDescText: {
    ...typography.caption,
    lineHeight: 17,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 5.5,
  },
  miniPreviewContainer: {
    marginTop: 12,
    padding: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  miniPreviewInnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  miniPreviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  miniPreviewDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  miniPreviewBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  miniPreviewSampleText: {
    fontSize: 12,
    fontWeight: '800',
  },
  swatchesGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  swatchCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    marginBottom: 18,
  },
  currencyBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  currencyBtnText: {
    ...typography.caption,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginTop: 4,
  },
  logoutBtnText: {
    ...typography.body,
    fontWeight: '700',
  },
});

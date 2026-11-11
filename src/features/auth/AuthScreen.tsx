import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/useAuthStore';
import { useThemeStore } from '../../store/useThemeStore';
import { biometricsService } from '../../services/auth/BiometricsService';
import { CustomInput, CustomButton, GlassCard, AioSplashSvg } from '../../components/common';
import { colors, ThemePalette, typography, borderRadius, spacing } from '../../theme';

type AuthScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Auth'>;
};

export const AuthScreen: React.FC<AuthScreenProps> = ({ navigation }) => {
  const { palette: colors, themeMode } = useThemeStore();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricsInfo, setBiometricsInfo] = useState<{
    available: boolean;
    label: string;
  }>({ available: false, label: 'Biometría' });

  const { login, register, loginAsGuest, loginWithBiometrics } = useAuthStore();

  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    const info = await biometricsService.isAvailable();
    if (info.hasHardware && info.isEnrolled) {
      setBiometricsInfo({ available: true, label: info.label });
    }
  };

  const handleSubmit = async () => {
    setErrorMessage('');

    if (isLogin) {
      if (!identifier.trim()) {
        setErrorMessage('Por favor ingresa tu usuario o correo electrónico');
        return;
      }
      if (!password) {
        setErrorMessage('Por favor ingresa tu contraseña');
        return;
      }

      setLoading(true);
      try {
        const res = await login(identifier.trim(), password);
        if (!res.success) {
          setErrorMessage(res.error || 'Credenciales inválidas');
        } else {
          navigation.replace('MainApp');
        }
      } catch {
        setErrorMessage('Ocurrió un error inesperado al iniciar sesión');
      } finally {
        setLoading(false);
      }
    } else {
      // Register flow
      if (!name.trim()) {
        setErrorMessage('Por favor ingresa tu nombre completo');
        return;
      }
      if (!identifier.trim()) {
        setErrorMessage('Por favor ingresa tu correo electrónico');
        return;
      }
      if (!password || password.length < 4) {
        setErrorMessage('La contraseña debe tener al menos 4 caracteres');
        return;
      }

      setLoading(true);
      try {
        const res = await register(
          name.trim(),
          identifier.trim(),
          password,
          username.trim() || undefined
        );
        if (!res.success) {
          setErrorMessage(res.error || 'Error al crear la cuenta en la base de datos');
        } else {
          navigation.replace('MainApp');
        }
      } catch {
        setErrorMessage('Ocurrió un error inesperado al registrar el usuario');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBiometricAuth = async () => {
    const success = await loginWithBiometrics();
    if (success) {
      navigation.replace('MainApp');
    } else {
      Alert.alert(
        'Autenticación Fallida',
        'No se pudo verificar tu identidad biométrica. Intenta con tu contraseña.'
      );
    }
  };

  const handleGuest = () => {
    loginAsGuest();
    navigation.replace('MainApp');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo Header */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <AioSplashSvg
                width={100}
                height={80}
                wordColor={themeMode === 'light' ? colors.textPrimary : '#FFFFFF'}
              />
            </View>
            <Text style={styles.appTitle}>AIO Hub</Text>
            <Text style={styles.appSubtitle}>
              {isLogin
                ? 'Bienvenido de vuelta. Ingresa a tu espacio.'
                : 'Crea tu cuenta y toma el control de tu vida.'}
            </Text>
          </View>

          {/* Form Card */}
          <GlassCard style={styles.card}>
            {/* Tab Selector */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setIsLogin(true);
                  setErrorMessage('');
                }}
                style={[styles.tabButton, isLogin && styles.activeTabButton]}
              >
                <Text style={[styles.tabText, isLogin && styles.activeTabText]}>
                  Iniciar Sesión
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setIsLogin(false);
                  setErrorMessage('');
                }}
                style={[styles.tabButton, !isLogin && styles.activeTabButton]}
              >
                <Text style={[styles.tabText, !isLogin && styles.activeTabText]}>
                  Registrarse
                </Text>
              </TouchableOpacity>
            </View>

            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            ) : null}

            {!isLogin && (
              <>
                <CustomInput
                  label="Nombre Completo"
                  placeholder="Ej. Diego Bueno"
                  value={name}
                  onChangeText={setName}
                  leftIcon={<Ionicons name="person-outline" size={20} color={colors.textSecondary} />}
                  autoCapitalize="words"
                />

                <CustomInput
                  label="Nombre de Usuario"
                  placeholder="Ej. dbueno"
                  value={username}
                  onChangeText={setUsername}
                  leftIcon={<Ionicons name="at-outline" size={20} color={colors.textSecondary} />}
                  autoCapitalize="none"
                />
              </>
            )}

            <CustomInput
              label={isLogin ? 'Usuario o Correo Electrónico' : 'Correo Electrónico'}
              placeholder={isLogin ? 'dbueno o usuario@ejemplo.com' : 'nombre@ejemplo.com'}
              value={identifier}
              onChangeText={setIdentifier}
              keyboardType={isLogin ? 'default' : 'email-address'}
              autoCapitalize="none"
              leftIcon={
                <Ionicons
                  name={isLogin ? 'person-circle-outline' : 'mail-outline'}
                  size={20}
                  color={colors.textSecondary}
                />
              }
            />

            <CustomInput
              label="Contraseña"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              isPassword
              leftIcon={<Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />}
            />

            <CustomButton
              title={isLogin ? 'Ingresar a AIO' : 'Crear Cuenta'}
              onPress={handleSubmit}
              loading={loading}
              variant="primary"
              style={styles.submitButton}
            />

            {/* Biometrics Action */}
            {biometricsInfo.available && isLogin && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleBiometricAuth}
                style={styles.biometricsButton}
              >
                <Ionicons
                  name={
                    biometricsInfo.label.includes('Face')
                      ? 'scan-outline'
                      : 'finger-print-outline'
                  }
                  size={22}
                  color={colors.cyanLight}
                />
                <Text style={styles.biometricsText}>
                  Ingresar con {biometricsInfo.label}
                </Text>
              </TouchableOpacity>
            )}
          </GlassCard>

          {/* Guest Mode Option */}
          <View style={styles.guestSection}>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o también</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleGuest}
              style={styles.guestButton}
            >
              <Ionicons name="compass-outline" size={20} color={colors.mintLight} />
              <Text style={styles.guestText}>Continuar en Modo Invitado</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (colors: ThemePalette) =>
  StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 100,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  appTitle: {
    ...typography.h1,
    letterSpacing: 1,
  },
  appSubtitle: {
    ...typography.subtitle,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
  },
  card: {
    padding: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  activeTabButton: {
    backgroundColor: colors.primary,
  },
  tabText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: '#FFF',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: borderRadius.sm,
    padding: 10,
    marginBottom: 16,
  },
  errorBannerText: {
    ...typography.caption,
    color: colors.danger,
    marginLeft: 8,
    flex: 1,
  },
  submitButton: {
    marginTop: 8,
  },
  biometricsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
  },
  biometricsText: {
    ...typography.button,
    color: colors.cyanLight,
    marginLeft: 10,
  },
  guestSection: {
    marginTop: 24,
    alignItems: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...typography.caption,
    color: colors.textMuted,
    paddingHorizontal: 12,
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  guestText: {
    ...typography.body,
    color: colors.mintLight,
    fontWeight: '600',
    marginLeft: 8,
  },
});

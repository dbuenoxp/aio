import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/useAuthStore';
import { CustomButton } from '../../components/common';
import { colors, typography, borderRadius, spacing } from '../../theme';

const { width } = Dimensions.get('window');

interface Slide {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: readonly [string, string, ...string[]];
  badgeText: string;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    badgeText: 'PRODUCTIVIDAD',
    title: 'Gestión Inteligente\nde Tareas & Alarmas',
    subtitle:
      'Organiza tus pendientes con prioridades, categorización y alarmas exactas que te mantienen enfocado y al día.',
    icon: 'checkbox-outline',
    gradient: colors.gradients.primary,
  },
  {
    id: '2',
    badgeText: 'CONTROL FINANCIERO',
    title: 'Finanzas Claras &\nMetas Proyectadas',
    subtitle:
      'Registra ingresos, gastos y proyecta tus metas financieras con desglose de hitos visuales y cálculos automáticos.',
    icon: 'wallet-outline',
    gradient: colors.gradients.mintCyan,
  },
  {
    id: '3',
    badgeText: 'SALUD & HÁBITOS',
    title: 'Fitness, Agua &\nBienestar Diario',
    subtitle:
      'Monitorea tu evolución de peso, mantén tu hidratación con alertas periódicas y registra tus sesiones de entrenamiento.',
    icon: 'fitness-outline',
    gradient: colors.gradients.indigoPurple,
  },
];

type OnboardingScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
};

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const { completeOnboarding } = useAuthStore();

  const handleFinish = async () => {
    await completeOnboarding();
    navigation.replace('Auth');
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    } else {
      handleFinish();
    }
  };

  const renderSlide = ({ item }: { item: Slide }) => {
    return (
      <View style={[styles.slideContainer, { width }]}>
        <View style={styles.cardWrapper}>
          <LinearGradient
            colors={item.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconCircle}
          >
            <Ionicons name={item.icon} size={64} color="#FFFFFF" />
          </LinearGradient>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.badgeText}</Text>
          </View>

          <Text style={styles.slideTitle}>{item.title}</Text>
          <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Image
            source={require('../../../assets/logo_aio.jpg')}
            style={styles.headerLogoImage}
            resizeMode="cover"
          />
          <Text style={styles.headerLogoText}>AIO</Text>
        </View>
        <TouchableOpacity onPress={handleFinish} activeOpacity={0.7} style={styles.skipButton}>
          <Text style={styles.skipText}>Omitir</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        style={styles.list}
      />

      <View style={styles.footer}>
        <View style={styles.paginationDots}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                currentIndex === index ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        <CustomButton
          title={currentIndex === SLIDES.length - 1 ? 'Comenzar Ahora' : 'Siguiente'}
          onPress={handleNext}
          variant="primary"
          style={styles.actionBtn}
          icon={
            <Ionicons
              name={currentIndex === SLIDES.length - 1 ? 'rocket-outline' : 'arrow-forward'}
              size={18}
              color="#FFF"
            />
          }
          iconPosition="right"
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogoImage: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
  headerLogoText: {
    ...typography.h3,
    color: colors.textPrimary,
    marginLeft: 8,
    fontWeight: '800',
    letterSpacing: 1,
  },
  skipButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skipText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  slideContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  cardWrapper: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 10,
  },
  badge: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  badgeText: {
    ...typography.caption,
    color: colors.cyanLight,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  slideTitle: {
    ...typography.h1,
    textAlign: 'center',
    marginBottom: 14,
    color: colors.textPrimary,
  },
  slideSubtitle: {
    ...typography.body,
    textAlign: 'center',
    color: colors.textSecondary,
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    width: 24,
    backgroundColor: colors.cyan,
  },
  inactiveDot: {
    width: 8,
    backgroundColor: colors.border,
  },
  actionBtn: {
    width: '100%',
  },
});

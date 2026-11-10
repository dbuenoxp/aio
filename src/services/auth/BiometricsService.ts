import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

export const biometricsService = {
  async isAvailable(): Promise<{
    hasHardware: boolean;
    isEnrolled: boolean;
    supportedTypes: LocalAuthentication.AuthenticationType[];
    label: string;
  }> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      let label = 'Biometría';
      if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        label = Platform.OS === 'ios' ? 'Face ID' : 'Reconocimiento Facial';
      } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        label = Platform.OS === 'ios' ? 'Touch ID' : 'Huella Dactilar';
      }

      return {
        hasHardware,
        isEnrolled,
        supportedTypes,
        label,
      };
    } catch (error) {
      console.warn('Error checking biometrics availability:', error);
      return {
        hasHardware: false,
        isEnrolled: false,
        supportedTypes: [],
        label: 'Biometría',
      };
    }
  },

  async authenticate(prompt = 'Acceso a AIO'): Promise<boolean> {
    try {
      const { hasHardware, isEnrolled } = await this.isAvailable();
      if (!hasHardware || !isEnrolled) {
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: prompt,
        cancelLabel: 'Cancelar',
        fallbackLabel: 'Ingresar con contraseña',
        disableDeviceFallback: false,
      });

      return result.success;
    } catch (error) {
      console.warn('Error during biometric authentication:', error);
      return false;
    }
  },
};

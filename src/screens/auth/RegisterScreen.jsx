import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { useForm, Controller } from 'react-hook-form';
import { colors } from '../../constants/colors';
import { registerUser } from '../../services/authService';
import { hapticSuccess, hapticError } from '../../utils/haptics';
import { playSound } from '../../utils/soundPlayer';

export default function RegisterScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [firebaseError, setFirebaseError] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const { control, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const password = watch('password');

  const onSubmit = async (data) => {
    setFirebaseError('');
    setLoading(true);
    try {
      await registerUser(data.name.trim(), data.email.trim(), data.password);
      await hapticSuccess();
      await playSound('app-intro');
      // AppNavigator detects new user and routes to Onboarding automatically
    } catch (e) {
      await hapticError();
      if (e.code === 'auth/email-already-in-use') {
        setFirebaseError('This email is already registered. Please log in instead.');
      } else if (e.code === 'auth/weak-password') {
        setFirebaseError('Password is too weak. Please use at least 6 characters.');
      } else if (e.code === 'auth/invalid-email') {
        setFirebaseError('The email address is not valid.');
      } else {
        setFirebaseError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.logoArea}>
          <Text variant="displaySmall" style={styles.logo}>ZiniQuest</Text>
          <Text variant="bodyLarge" style={styles.tagline}>Join thousands of learners</Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          <Text variant="headlineSmall" style={styles.cardTitle}>Create your account</Text>
          <Text variant="bodyMedium" style={styles.cardSub}>
            It's free and takes less than a minute
          </Text>

          {/* Full Name */}
          <Controller
            control={control}
            name="name"
            rules={{
              required: 'Full name is required',
              minLength: { value: 2, message: 'Name must be at least 2 characters' },
            }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Full Name"
                value={value}
                onChangeText={onChange}
                mode="outlined"
                autoCapitalize="words"
                autoComplete="name"
                style={styles.input}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                textColor={colors.textPrimary}
                theme={{ colors: { onSurfaceVariant: colors.textSecondary } }}
                error={!!errors.name}
                left={<TextInput.Icon icon="account" color={colors.textSecondary} />}
              />
            )}
          />
          {errors.name && (
            <HelperText type="error" visible style={styles.helperText}>
              {errors.name.message}
            </HelperText>
          )}

          {/* Email */}
          <Controller
            control={control}
            name="email"
            rules={{
              required: 'Email is required',
              pattern: {
                value: /\S+@\S+\.\S+/,
                message: 'Enter a valid email address',
              },
            }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Email"
                value={value}
                onChangeText={onChange}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={styles.input}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                textColor={colors.textPrimary}
                theme={{ colors: { onSurfaceVariant: colors.textSecondary } }}
                error={!!errors.email}
                left={<TextInput.Icon icon="email" color={colors.textSecondary} />}
              />
            )}
          />
          {errors.email && (
            <HelperText type="error" visible style={styles.helperText}>
              {errors.email.message}
            </HelperText>
          )}

          {/* Password */}
          <Controller
            control={control}
            name="password"
            rules={{
              required: 'Password is required',
              minLength: { value: 6, message: 'Password must be at least 6 characters' },
            }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Password"
                value={value}
                onChangeText={onChange}
                mode="outlined"
                secureTextEntry={!passwordVisible}
                style={styles.input}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                textColor={colors.textPrimary}
                theme={{ colors: { onSurfaceVariant: colors.textSecondary } }}
                error={!!errors.password}
                left={<TextInput.Icon icon="lock" color={colors.textSecondary} />}
                right={
                  <TextInput.Icon
                    icon={passwordVisible ? 'eye-off' : 'eye'}
                    onPress={() => setPasswordVisible(!passwordVisible)}
                    color={colors.textSecondary}
                  />
                }
              />
            )}
          />
          {errors.password && (
            <HelperText type="error" visible style={styles.helperText}>
              {errors.password.message}
            </HelperText>
          )}

          {/* Confirm Password */}
          <Controller
            control={control}
            name="confirmPassword"
            rules={{
              required: 'Please confirm your password',
              validate: (value) =>
                value === password || 'Passwords do not match',
            }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                label="Confirm Password"
                value={value}
                onChangeText={onChange}
                mode="outlined"
                secureTextEntry={!confirmVisible}
                style={styles.input}
                outlineColor={colors.border}
                activeOutlineColor={colors.primary}
                textColor={colors.textPrimary}
                theme={{ colors: { onSurfaceVariant: colors.textSecondary } }}
                error={!!errors.confirmPassword}
                left={<TextInput.Icon icon="lock-check" color={colors.textSecondary} />}
                right={
                  <TextInput.Icon
                    icon={confirmVisible ? 'eye-off' : 'eye'}
                    onPress={() => setConfirmVisible(!confirmVisible)}
                    color={colors.textSecondary}
                  />
                }
              />
            )}
          />
          {errors.confirmPassword && (
            <HelperText type="error" visible style={styles.helperText}>
              {errors.confirmPassword.message}
            </HelperText>
          )}

          {/* Firebase error */}
          {firebaseError ? (
            <HelperText type="error" visible style={styles.helperText}>
              {firebaseError}
            </HelperText>
          ) : null}

          {/* Register button */}
          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            disabled={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text variant="bodySmall" style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          {/* Login link */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.loginRow}
          >
            <Text variant="bodyMedium" style={styles.loginText}>
              Already have an account?{' '}
              <Text style={styles.loginLink}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logo: {
    color: colors.primary,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  tagline: {
    color: colors.textSecondary,
    marginTop: 6,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardSub: {
    color: colors.textSecondary,
    marginBottom: 24,
  },
  input: {
    backgroundColor: colors.background,
    marginBottom: 4,
  },
  helperText: {
    color: colors.error,
    marginBottom: 4,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 20,
  },
  buttonContent: {
    height: 50,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    color: colors.textSecondary,
    marginHorizontal: 12,
  },
  loginRow: {
    alignItems: 'center',
  },
  loginText: {
    color: colors.textSecondary,
  },
  loginLink: {
    color: colors.primary,
    fontWeight: 'bold',
  },
});
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
import { loginUser } from '../../services/authService';
import { hapticSuccess, hapticError } from '../../utils/haptics';
import { playSound } from '../../utils/soundPlayer';

export default function LoginScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [firebaseError, setFirebaseError] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data) => {
    setFirebaseError('');
    setLoading(true);
    try {
      await loginUser(data.email.trim(), data.password);
      await hapticSuccess();
      await playSound('button-tap');
      // Navigation handled automatically by AppNavigator auth state listener
    } catch (e) {
      await hapticError();
      if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        setFirebaseError('Incorrect email or password. Please try again.');
      } else if (e.code === 'auth/too-many-requests') {
        setFirebaseError('Too many attempts. Please wait a moment and try again.');
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
        {/* Logo area */}
        <View style={styles.logoArea}>
          <Text variant="displaySmall" style={styles.logo}>ZiniQuest</Text>
          <Text variant="bodyLarge" style={styles.tagline}>Your learning journey starts here</Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          <Text variant="headlineSmall" style={styles.cardTitle}>Welcome back</Text>
          <Text variant="bodyMedium" style={styles.cardSub}>Sign in to continue learning</Text>

          {/* Email */}
          <Controller
            control={control}
            name="email"
            rules={{
              required: 'Email is required',
              pattern: { value: /\S+@\S+\.\S+/, message: 'Enter a valid email address' },
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
            rules={{ required: 'Password is required' }}
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

          {/* Firebase error */}
          {firebaseError ? (
            <HelperText type="error" visible style={styles.helperText}>
              {firebaseError}
            </HelperText>
          ) : null}

          {/* Forgot password */}
          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotRow}
          >
            <Text variant="bodySmall" style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Login button */}
          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            disabled={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text variant="bodySmall" style={styles.dividerText}>or</Text>
            <View style={styles.divider} />
          </View>

          {/* Register link */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            style={styles.registerRow}
          >
            <Text variant="bodyMedium" style={styles.registerText}>
              Don't have an account?{' '}
              <Text style={styles.registerLink}>Create one</Text>
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
  forgotRow: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: 4,
  },
  forgotText: {
    color: colors.primary,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
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
  registerRow: {
    alignItems: 'center',
  },
  registerText: {
    color: colors.textSecondary,
  },
  registerLink: {
    color: colors.primary,
    fontWeight: 'bold',
  },
});
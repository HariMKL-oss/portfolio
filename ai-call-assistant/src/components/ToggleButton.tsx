import React, { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { COLORS, FONT_SIZE, RecordingState } from '../types';

interface ToggleButtonProps {
  state: RecordingState;
  onPress: () => void;
  recordingDuration?: number;
  processingLabel?: string;
}

/**
 * The big push-to-talk toggle button.
 *
 * States:
 * - idle: Blue, "TAP TO LISTEN"
 * - recording: Red with pulsing glow, "LISTENING... TAP TO STOP"
 * - processing: Amber with spinning indicator, "PROCESSING..."
 */
export default function ToggleButton({
  state,
  onPress,
  recordingDuration = 0,
  processingLabel = 'Generating your answer...',
}: ToggleButtonProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  // Pulsing animation for recording state
  useEffect(() => {
    if (state === 'recording') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      const glow = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.7,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      glow.start();
      return () => {
        pulse.stop();
        glow.stop();
      };
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0.3);
    }
  }, [state]);

  // Spinning animation for processing state
  useEffect(() => {
    if (state === 'processing') {
      const spin = Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      );
      spin.start();
      return () => spin.stop();
    } else {
      spinAnim.setValue(0);
    }
  }, [state]);

  const spinInterpolation = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getButtonColor = () => {
    switch (state) {
      case 'recording':
        return COLORS.danger;
      case 'processing':
        return COLORS.warning;
      default:
        return COLORS.primary;
    }
  };

  const getGlowColor = () => {
    switch (state) {
      case 'recording':
        return COLORS.dangerDim;
      case 'processing':
        return COLORS.warningDim;
      default:
        return COLORS.primaryDim;
    }
  };

  const getLabel = () => {
    switch (state) {
      case 'recording':
        return 'LISTENING...';
      case 'processing':
        return 'PROCESSING...';
      default:
        return 'TAP TO LISTEN';
    }
  };

  const getSublabel = () => {
    switch (state) {
      case 'recording':
        return 'Tap again when question ends';
      case 'processing':
        return processingLabel;
      default:
        return 'Start when interviewer asks a question';
    }
  };

  const getIcon = () => {
    switch (state) {
      case 'recording':
        return '⏹';
      case 'processing':
        return '⚡';
      default:
        return '🎙️';
    }
  };

  return (
    <View style={styles.container}>
      {/* Outer glow ring */}
      <Animated.View
        style={[
          styles.glowRing,
          {
            backgroundColor: getGlowColor(),
            transform: [{ scale: pulseAnim }],
            opacity: glowAnim,
          },
        ]}
      />

      {/* Main button */}
      <Animated.View
        style={[
          styles.buttonOuter,
          { transform: [{ scale: pulseAnim }] },
        ]}
      >
        <TouchableOpacity
          style={[styles.button, { backgroundColor: getButtonColor() }]}
          onPress={onPress}
          activeOpacity={0.8}
          disabled={state === 'processing'}
          accessibilityRole="button"
          accessibilityLabel={getLabel()}
          accessibilityHint={getSublabel()}
          accessibilityState={{ disabled: state === 'processing' }}
        >
          {state === 'processing' ? (
            <Animated.Text
              style={[
                styles.icon,
                { transform: [{ rotate: spinInterpolation }] },
              ]}
            >
              {getIcon()}
            </Animated.Text>
          ) : (
            <Text style={styles.icon}>{getIcon()}</Text>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* Duration display (while recording) */}
      {state === 'recording' && (
        <Text style={styles.duration}>
          {formatDuration(recordingDuration)}
        </Text>
      )}

      {/* Label */}
      <Text style={styles.label}>{getLabel()}</Text>
      <Text style={styles.sublabel}>{getSublabel()}</Text>
    </View>
  );
}

const BUTTON_SIZE = 140;
const GLOW_SIZE = 200;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  glowRing: {
    position: 'absolute',
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
  },
  buttonOuter: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    // Shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  icon: {
    fontSize: 48,
  },
  duration: {
    marginTop: 16,
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
    color: COLORS.danger,
    fontVariant: ['tabular-nums'],
  },
  label: {
    marginTop: 12,
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: 1.5,
  },
  sublabel: {
    marginTop: 4,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
});

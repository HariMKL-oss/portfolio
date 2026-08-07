import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { COLORS } from '../types';

interface AudioVisualizerProps {
  isActive: boolean;
  level?: number;
  barCount?: number;
}

export default function AudioVisualizer({
  isActive,
  level = 0,
  barCount = 24,
}: AudioVisualizerProps) {
  const animatedLevel = useRef(new Animated.Value(0.05)).current;
  const profiles = useMemo(() => {
    const center = Math.max(1, (barCount - 1) / 2);
    return Array.from({ length: barCount }, (_, index) => {
      const centerWeight = 1 - Math.abs(index - center) / center;
      return 0.4 + Math.max(0, centerWeight) * 0.6;
    });
  }, [barCount]);

  useEffect(() => {
    Animated.timing(animatedLevel, {
      toValue: isActive ? Math.max(0.08, level) : 0.05,
      duration: 90,
      useNativeDriver: true,
    }).start();
  }, [animatedLevel, isActive, level]);

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel={isActive ? 'Microphone input level' : 'Microphone inactive'}
    >
      {profiles.map((profile, index) => {
        const scale = Animated.multiply(animatedLevel, profile).interpolate({
          inputRange: [0, 1],
          outputRange: [0.18, 1],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.bar,
              {
                opacity: isActive ? 1 : 0.35,
                transform: [{ scaleY: scale }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 12,
  },
  bar: {
    width: 3,
    height: 36,
    borderRadius: 2,
    backgroundColor: COLORS.danger,
  },
});

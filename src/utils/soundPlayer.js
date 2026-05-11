import { Audio } from 'expo-av';

let soundEnabled = true;

export function setSoundEnabled(val) {
  soundEnabled = val;
}

export async function playSound(name) {
  if (!soundEnabled) return;

  const soundFiles = {
    'xp-earn':          require('../../assets/sounds/xp-earn.mp3'),
    'badge-unlock':     require('../../assets/sounds/badge-unlock.mp3'),
    'level-up':         require('../../assets/sounds/level-up.mp3'),
    'correct-answer':   require('../../assets/sounds/correct-answer.mp3'),
    'wrong-answer':     require('../../assets/sounds/wrong-answer.mp3'),
    'button-tap':       require('../../assets/sounds/button-tap.mp3'),
    'streak-milestone': require('../../assets/sounds/streak-milestone.mp3'),
    'quiz-tick':        require('../../assets/sounds/quiz-tick.mp3'),
    'app-intro':        require('../../assets/sounds/app-intro.mp3'),
  };

  try {
    const file = soundFiles[name];
    if (!file) return;
    const { sound } = await Audio.Sound.createAsync(file);
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) sound.unloadAsync();
    });
  } catch (e) {
    // Silently fail
  }
}
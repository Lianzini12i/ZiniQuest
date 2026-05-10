import { Audio } from 'expo-av';

const soundMap = {
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

let soundEnabled = true;

export function setSoundEnabled(val) {
  soundEnabled = val;
}

export async function playSound(name) {
  if (!soundEnabled) return;
  try {
    const { sound } = await Audio.Sound.createAsync(soundMap[name]);
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate(status => {
      if (status.didJustFinish) sound.unloadAsync();
    });
  } catch (e) {
    // Silently fail if sound file not yet added
  }
}
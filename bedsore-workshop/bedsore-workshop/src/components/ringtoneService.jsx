// ringtoneService.js - Handle ringtone playback

class RingtoneService {
    constructor() {
      this.ringtone = null;
      this.isPlaying = false;
    }
  
    initialize(ringtonePath = '/sounds/ringtone.mp3') {
      if (!this.ringtone) {
        this.ringtone = new Audio(ringtonePath);
        this.ringtone.loop = true;
        
        // Pre-load the ringtone
        this.ringtone.load();
        
        // Handle iOS restrictions by attempting a silent play on initialization
        document.addEventListener('click', this.preloadAudio, { once: true });
      }
    }
    
    // This helps with iOS restrictions which require user interaction before audio can play
    preloadAudio = () => {
      if (this.ringtone) {
        // Play and immediately pause to "warm up" the audio element
        this.ringtone.volume = 0;
        this.ringtone.play().then(() => {
          this.ringtone.pause();
          this.ringtone.currentTime = 0;
          this.ringtone.volume = 1;
        }).catch(err => {
          console.log('Audio preload failed (not critical):', err);
        });
      }
    }
  
    play() {
      if (!this.ringtone) {
        this.initialize();
      }
      
      if (this.ringtone && !this.isPlaying) {
        this.ringtone.currentTime = 0;
        this.ringtone.volume = 1;
        
        // Play with catch to handle autoplay restrictions gracefully
        this.ringtone.play().then(() => {
          this.isPlaying = true;
        }).catch(err => {
          console.log('Could not play ringtone (user interaction may be required):', err);
        });
      }
    }
  
    stop() {
      if (this.ringtone && this.isPlaying) {
        this.ringtone.pause();
        this.ringtone.currentTime = 0;
        this.isPlaying = false;
      }
    }
  }
  
  // Create and export singleton instance
  const ringtoneService = new RingtoneService();
  export default ringtoneService;
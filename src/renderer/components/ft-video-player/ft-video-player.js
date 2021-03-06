import Vue from 'vue'
import FtCard from '../ft-card/ft-card.vue'

import $ from 'jquery'

// I haven't decided which video player I want to use
// Need to expirement with both of them to see which one will work best.
import videojs from 'video.js'
import qualitySelector from '@silvermine/videojs-quality-selector'
import 'videojs-vtt-thumbnails'
import 'videojs-contrib-quality-levels'
import 'videojs-http-source-selector'
// import mediaelement from 'mediaelement'

export default Vue.extend({
  name: 'FtVideoPlayer',
  components: {
    'ft-card': FtCard
  },
  props: {
    format: {
      type: String,
      required: true
    },
    sourceList: {
      type: Array,
      default: null
    },
    dashSrc: {
      type: Array,
      default: null
    },
    hlsSrc: {
      type: Array,
      default: null
    },
    captionList: {
      type: Array,
      default: () => { return [] }
    },
    storyboardSrc: {
      type: String,
      default: ''
    }
  },
  data: function () {
    return {
      id: '',
      player: null,
      useDash: false,
      useHls: false,
      activeSourceList: [],
      mouseTimeout: null,
      dataSetup: {
        aspectRatio: '16:9',
        nativeTextTracks: false,
        plugins: {},
        controlBar: {
          children: [
            'playToggle',
            'volumePanel',
            'currentTimeDisplay',
            'timeDivider',
            'durationDisplay',
            'progressControl',
            'liveDisplay',
            'seekToLive',
            'remainingTimeDisplay',
            'customControlSpacer',
            'playbackRateMenuButton',
            'chaptersButton',
            'descriptionsButton',
            'subsCapsButton',
            'audioTrackButton',
            'QualitySelector',
            'pictureInPictureToggle',
            'fullscreenToggle'
          ]
        },
        playbackRates: [
          0.25,
          0.5,
          0.75,
          1,
          1.25,
          1.5,
          1.75,
          2,
          2.25,
          2.5,
          2.75,
          3
        ]
      }
    }
  },
  computed: {
    listType: function () {
      return this.$store.getters.getListType
    },

    videoFormatPreference: function () {
      return this.$store.getters.getVideoFormatPreference
    },

    autoplay: function () {
      return this.$store.getters.getAutoplay
    }
  },
  mounted: function () {
    this.id = this._uid

    this.determineFormatType()
  },
  beforeDestroy: function () {
    if (this.player !== null && !this.player.isInPictureInPicture()) {
      this.player.dispose()
      this.player = null
      clearTimeout(this.mouseTimeout)
    }
  },
  methods: {
    initializePlayer: function () {
      const videoPlayer = document.getElementById(this.id)
      if (videoPlayer !== null) {
        if (!this.useDash && !this.useHls) {
          qualitySelector(videojs, { showQualitySelectionLabelInControlBar: true })
        }

        this.player = videojs(videoPlayer)

        this.player.vttThumbnails({
          src: this.storyboardSrc
        })

        if (this.useDash) {
          this.dataSetup.plugins.httpSourceSelector = {
            default: 'auto'
          }

          this.player.httpSourceSelector()
        }

        if (this.autoplay) {
          // Calling play() won't happen right away, so a quick timeout will make it function properly.
          setTimeout(() => {
            this.player.play()
          }, 100)
        }

        $(document).on('keydown', this.keyboardShortcutHandler)

        this.player.on('mousemove', this.hideMouseTimeout)
        this.player.on('mouseleave', this.removeMouseTimeout)

        const v = this

        this.player.on('error', function (error, message) {
          v.$emit('error', error.target.player.error_)
        })
      }
    },

    determineFormatType: function () {
      if (this.format === 'dash') {
        this.enableDashFormat()
      } else {
        this.enableLegacyFormat()
      }
    },

    enableDashFormat: function () {
      if (this.dashSrc === null) {
        console.log('No dash format available.')
        return
      }

      this.useDash = true
      this.useHls = false
      this.activeSourceList = this.dashSrc

      setTimeout(this.initializePlayer, 1000)
    },

    enableLegacyFormat: function () {
      if (this.sourceList.length === 0) {
        console.log('No sources available')
        return
      }

      this.useDash = false
      this.useHls = false
      this.activeSourceList = this.sourceList

      setTimeout(this.initializePlayer, 100)
    },

    togglePlayPause: function () {
      if (this.player.paused()) {
        this.player.play()
      } else {
        this.player.pause()
      }
    },

    changeDurationBySeconds: function (seconds) {
      const currentTime = this.player.currentTime()
      const newTime = currentTime + seconds

      if (newTime < 0) {
        this.player.currentTime(0)
      } else if (newTime > this.player.duration) {
        this.player.currentTime(this.player.duration)
      } else {
        this.player.currentTime(newTime)
      }
    },

    changeDurationByPercentage: function (percentage) {
      const duration = this.player.duration()
      const newTime = duration * percentage

      this.player.currentTime(newTime)
    },

    changePlayBackRate: function (rate) {
      const newPlaybackRate = this.player.playbackRate() + rate

      if (newPlaybackRate >= 0.25 && newPlaybackRate <= 3) {
        this.player.playbackRate(newPlaybackRate)
      }
    },

    changeVolume: function (volume) {
      const currentVolume = this.player.volume()
      const newVolume = currentVolume + volume

      if (newVolume < 0) {
        this.player.volume(0)
      } else if (newVolume > 1) {
        this.player.volume(1)
      } else {
        this.player.volume(newVolume)
      }
    },

    toggleMute: function () {
      if (this.player.muted()) {
        this.player.muted(false)
      } else {
        this.player.muted(true)
      }
    },

    toggleFullscreen: function () {
      if (this.player.isFullscreen()) {
        this.player.exitFullscreen()
      } else {
        this.player.requestFullscreen()
      }
    },

    toggleCaptions: function () {
      const tracks = this.player.textTracks().tracks_

      if (tracks.length > 1) {
        if (tracks[1].mode === 'showing') {
          tracks[1].mode = 'disabled'
        } else {
          tracks[1].mode = 'showing'
        }
      }
    },

    hideMouseTimeout: function () {
      if (this.id === '') {
        return
      }

      const videoPlayer = $(`#${this.id} video`).get(0)
      if (typeof (videoPlayer) !== 'undefined') {
        videoPlayer.style.cursor = 'default'
        clearTimeout(this.mouseTimeout)
        this.mouseTimeout = window.setTimeout(function () {
          videoPlayer.style.cursor = 'none'
        }, 2650)
      }
    },

    removeMouseTimeout: function () {
      if (this.mouseTimeout !== null) {
        clearTimeout(this.mouseTimeout)
      }
    },

    keyboardShortcutHandler: function (event) {
      const activeInputs = $('.ft-input')

      for (let i = 0; i < activeInputs.length; i++) {
        if (activeInputs[i] === document.activeElement) {
          return
        }
      }

      if (this.player !== null) {
        event.preventDefault()
        switch (event.which) {
          case 32:
            // Space Bar
            // Toggle Play/Pause
            this.togglePlayPause()
            break
          case 74:
            // J Key
            // Rewind by 10 seconds
            this.changeDurationBySeconds(-10)
            break
          case 75:
            // K Key
            // Toggle Play/Pause
            this.togglePlayPause()
            break
          case 76:
            // L Key
            // Fast Forward by 10 seconds
            this.changeDurationBySeconds(10)
            break
          case 79:
            // O Key
            // Decrease playback rate by 0.25x
            this.changePlayBackRate(-0.25)
            break
          case 80:
            // P Key
            // Increase playback rate by 0.25x
            this.changePlayBackRate(0.25)
            break
          case 70:
            // F Key
            // Toggle Fullscreen Playback
            this.toggleFullscreen()
            break
          case 77:
            // M Key
            // Toggle Mute
            this.toggleMute()
            break
          case 67:
            // C Key
            // Toggle Captions
            this.toggleCaptions()
            break
          case 38:
            // Up Arrow Key
            // Increase volume
            this.changeVolume(0.05)
            break
          case 40:
            // Down Arrow Key
            // Descrease Volume
            this.changeVolume(-0.05)
            break
          case 37:
            // Left Arrow Key
            // Rewind by 5 seconds
            this.changeDurationBySeconds(-5)
            break
          case 39:
            // Right Arrow Key
            // Fast Foward by 5 seconds
            this.changeDurationBySeconds(5)
            break
          case 49:
            // 1 Key
            // Jump to 10% in the video
            this.changeDurationByPercentage(0.1)
            break
          case 50:
            // 2 Key
            // Jump to 20% in the video
            this.changeDurationByPercentage(0.2)
            break
          case 51:
            // 3 Key
            // Jump to 30% in the video
            this.changeDurationByPercentage(0.3)
            break
          case 52:
            // 4 Key
            // Jump to 40% in the video
            this.changeDurationByPercentage(0.4)
            break
          case 53:
            // 5 Key
            // Jump to 50% in the video
            this.changeDurationByPercentage(0.5)
            break
          case 54:
            // 6 Key
            // Jump to 60% in the video
            this.changeDurationByPercentage(0.6)
            break
          case 55:
            // 7 Key
            // Jump to 70% in the video
            this.changeDurationByPercentage(0.7)
            break
          case 56:
            // 8 Key
            // Jump to 80% in the video
            this.changeDurationByPercentage(0.8)
            break
          case 57:
            // 9 Key
            // Jump to 90% in the video
            this.changeDurationByPercentage(0.9)
            break
          case 48:
            // 0 Key
            // Jump to 0% in the video (The beginning)
            this.changeDurationByPercentage(0)
            break
        }
      }
    }
  },
  beforeRouteLeave: function () {
    if (this.player !== null && !this.player.isInPictureInPicture()) {
      this.player.dispose()
      this.player = null
      clearTimeout(this.mouseTimeout)
    }
  }
})

import Vue from 'vue'
import TopNav from './components/top-nav/top-nav.vue'
import SideNav from './components/side-nav/side-nav.vue'
import $ from 'jquery'
import { shell } from 'electron'

export default Vue.extend({
  name: 'App',
  components: {
    TopNav,
    SideNav
  },
  computed: {
    isOpen: function () {
      return this.$store.getters.getIsSideNavOpen
    }
  },
  mounted: function () {
    this.$store.dispatch('grabUserSettings')

    const theme = localStorage.getItem('theme')
    console.log(theme)

    if (theme !== null) {
      this.updateTheme(theme)
    }

    // Open links externally by default
    $(document).on('click', 'a[href^="http"]', (event) => {
      const el = event.currentTarget
      console.log(el)
      if (typeof (shell) !== 'undefined') {
        event.preventDefault()
        shell.openExternal(el.href)
      }
    })
  },
  methods: {
    updateTheme: function (theme) {
      console.log(theme)
      const body = document.getElementsByTagName('body')[0]
      body.className = theme
      localStorage.setItem('theme', theme)
    }
  }
})

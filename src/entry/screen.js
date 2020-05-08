import Vue from 'vue'
import ScreenApp from '../ScreenApp.vue'
import AirConsole from '../vendor/airconsole'

Vue.config.productionTip = false
Object.defineProperty(Vue.prototype, '$airconsole', { value: new AirConsole() })
Object.defineProperty(Vue.prototype, '$screen', { value: 0 })

new Vue({
  render: h => h(ScreenApp),
}).$mount('#app')

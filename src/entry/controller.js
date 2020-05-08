import Vue from 'vue'
import ControllerApp from '../ControllerApp.vue'
import AirConsole from '../vendor/airconsole'

Vue.config.productionTip = false
Object.defineProperty(Vue.prototype, '$airconsole', { value: new AirConsole() })
Object.defineProperty(Vue.prototype, '$screen', { value: 0 })

new Vue({
  render: h => h(ControllerApp),
}).$mount('#app')

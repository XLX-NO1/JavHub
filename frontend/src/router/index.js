import { createRouter, createWebHistory } from 'vue-router'

// ==============================================
// 路由懒加载 - 提升首屏加载速度
// ==============================================

const Home = () => import('../views/Home.vue')
const Search = () => import('../views/Search.vue')
const Genres = () => import('../views/Genres.vue')
const MagnetParse = () => import('../views/MagnetParse.vue')
const Subscription = () => import('../views/Subscription.vue')
const Library = () => import('../views/Library.vue')
const Logs = () => import('../views/Logs.vue')
const Config = () => import('../views/Config.vue')
const Actor = () => import('../views/Actor.vue')
const Favorites = () => import('../views/Favorites.vue')
const GenreDetail = () => import('../views/GenreDetail.vue')
const Missing = () => import('../views/Missing.vue')
const MissingDetail = () => import('../views/MissingDetail.vue')
const Duplicates = () => import('../views/Duplicates.vue')

const routes = [
  { path: '/', component: Genres },
  { path: '/downloads', component: Home },
  { path: '/search', component: Search },
  { path: '/genres', component: Genres },
  { path: '/genres/:categoryId', name: 'GenreDetail', component: GenreDetail },
  { path: '/parse', component: MagnetParse },
  { path: '/subscription', component: Subscription },
  { path: '/library', component: Library },
  { path: '/logs', component: Logs },
  { path: '/settings', component: Config },
  { path: '/config', redirect: '/settings' },
  { path: '/actor/:name', component: Actor },
  { path: '/favorites', component: Favorites },
  { path: '/missing', name: 'Missing', component: Missing },
  { path: '/missing/:id', name: 'MissingDetail', component: MissingDetail },
  { path: '/duplicates', name: 'Duplicates', component: Duplicates },
  { path: '/tasks', redirect: '/downloads' },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    return { top: 0 }
  }
})

export default router

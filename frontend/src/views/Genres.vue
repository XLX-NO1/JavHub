<template>
  <div class="genres-page">
    <!-- Hero -->
    <div class="genres-hero">
      <h1 class="hero-title">题材发现</h1>
      <p class="hero-subtitle">随机浏览，发现更多内容</p>
    </div>

    <!-- 标签气泡云 -->
    <div class="tag-cloud-wrap" ref="cloudRef">
      <div class="cloud-header">
        <span class="cloud-hint">共 {{ categories.length }} 个题材</span>
        <button class="shuffle-btn" @click="reshuffle" :disabled="loading">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <polyline points="23 4 23 10 17 10"/>
            <polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          换一批
        </button>
      </div>

      <div v-if="loading" class="loading-wrap">
        <div class="spinner-large"></div>
        <p>加载题材中...</p>
      </div>

      <div v-else ref="tagCloudRef" class="tag-cloud">
        <div
          v-for="tag in shuffledTags"
          :key="tag.id"
          class="bubble"
          :data-id="tag.id"
          :style="bubbleStyle(tag)"
          @click="goGenre(tag)"
        >
          {{ tag.name_en || tag.name_ja || tag.name }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import gsap from 'gsap'
import api from '../api'

const BUBBLE_COLORS = [
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #fa709a, #fee140)',
  'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  'linear-gradient(135deg, #ff9a9e, #fecfef)',
  'linear-gradient(135deg, #ffecd2, #fcb69f)',
  'linear-gradient(135deg, #84fab0, #8fd3f4)',
  'linear-gradient(135deg, #cfd9df, #e2ebf0)',
  'linear-gradient(135deg, #a1c4fd, #c2e9fb)',
  'linear-gradient(135deg, #d4fc79, #96e6a1)',
]

function hashCode(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default {
  name: 'Genres',
  data() {
    return {
      categories: [],
      shuffledTags: [],
      loading: false
    }
  },
  async mounted() {
    await this.loadCategories()
  },
  methods: {
    bubbleStyle(tag) {
      const idx = hashCode(tag.name_en || tag.name_ja || tag.name) % BUBBLE_COLORS.length
      const baseSize = 16 + (hashCode((tag.name_en || tag.name_ja || tag.name) + 'size') % 14)
      return {
        background: BUBBLE_COLORS[idx],
        fontSize: `${baseSize}px`,
      }
    },
    async loadCategories() {
      this.loading = true
      try {
        const resp = await api.listCategories()
        this.categories = Array.isArray(resp.data) ? resp.data : (resp.data.data || [])
        this.shuffledTags = shuffle(this.categories)
      } catch (e) {
        console.error('Load categories failed:', e)
        this.categories = []
      } finally {
        this.loading = false
        this.$nextTick(() => this.initGsap())
      }
    },
    initGsap() {
      const cloud = this.$refs.tagCloudRef
      if (!cloud) return
      const bubbles = cloud.querySelectorAll('.bubble')

      // entrance: fast staggered pop-in
      gsap.fromTo(bubbles,
        { scale: 0, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.35,
          stagger: { each: 0.008, grid: 'auto', from: 'random' },
          ease: 'back.out(1.7)',
        }
      )

      // subtle float
      bubbles.forEach((bubble, i) => {
        gsap.to(bubble, {
          y: -6,
          duration: 1.4 + (i % 4) * 0.25,
          repeat: -1,
          yoyo: true,
          ease: 'sine.inOut',
          delay: i * 0.04,
        })
      })

      cloud.addEventListener('mousemove', this.handleMouseMove)
      cloud.addEventListener('mouseleave', this.handleMouseLeave)
    },
    handleMouseMove(e) {
      const cloud = this.$refs.tagCloudRef
      if (!cloud) return
      const mouseX = e.clientX
      const mouseY = e.clientY
      const bubbles = cloud.querySelectorAll('.bubble')

      bubbles.forEach(bubble => {
        const r = bubble.getBoundingClientRect()
        const dist = Math.hypot(mouseX - (r.left + r.width / 2), mouseY - (r.top + r.height / 2))
        const maxDist = 180

        if (dist < maxDist) {
          const scale = 1 + (1 - dist / maxDist) * 0.55
          gsap.to(bubble, {
            scale,
            opacity: 1,
            duration: 0.18,
            ease: 'back.out(1.2)',
            overwrite: 'auto',
          })
        } else {
          gsap.to(bubble, {
            scale: 1,
            opacity: 0.88,
            duration: 0.22,
            ease: 'power3.out',
            overwrite: 'auto',
          })
        }
      })
    },
    handleMouseLeave() {
      const cloud = this.$refs.tagCloudRef
      if (!cloud) return
      const bubbles = cloud.querySelectorAll('.bubble')
      gsap.to(bubbles, {
        scale: 1,
        opacity: 0.88,
        duration: 0.35,
        ease: 'back.out(1.2)',
        stagger: 0.005,
      })
    },
    reshuffle() {
      const cloud = this.$refs.tagCloudRef
      if (!cloud) {
        this.shuffledTags = shuffle(this.categories)
        return
      }
      const bubbles = cloud.querySelectorAll('.bubble')
      // fast simultaneous shrink
      gsap.to(bubbles, {
        scale: 0,
        opacity: 0,
        duration: 0.12,
        ease: 'power2.in',
      })
      setTimeout(() => {
        this.shuffledTags = shuffle(this.categories)
        this.$nextTick(() => {
          const newBubbles = cloud.querySelectorAll('.bubble')
          gsap.fromTo(newBubbles,
            { scale: 0.5, opacity: 0 },
            {
              scale: 1,
              opacity: 0.88,
              duration: 0.3,
              stagger: { each: 0.006, grid: 'auto', from: 'random' },
              ease: 'back.out(2)',
            }
          )
        })
      }, 140)
    },
    goGenre(tag) {
      this.$router.push({ name: 'GenreDetail', params: { categoryId: tag.id } })
    }
  },
  beforeUnmount() {
    const cloud = this.$refs.tagCloudRef
    if (cloud) {
      cloud.removeEventListener('mousemove', this.handleMouseMove)
      cloud.removeEventListener('mouseleave', this.handleMouseLeave)
    }
  }
}
</script>

<style scoped>
.genres-page {
  min-height: 100vh;
  background: var(--bg-primary);
}

.genres-hero {
  text-align: center;
  padding: 48px 20px 32px;
  background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
}

.hero-title {
  font-size: 36px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.hero-subtitle {
  font-size: 14px;
  color: var(--text-muted);
}

.tag-cloud-wrap {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.cloud-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 16px;
}

.cloud-hint {
  font-size: 13px;
  color: var(--text-muted);
}

.shuffle-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  padding: 6px 14px;
  border-radius: 20px;
  transition: var(--transition);
}

.shuffle-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.shuffle-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-wrap {
  text-align: center;
  padding: 60px;
  color: var(--text-secondary);
}

.spinner-large {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255,255,255,0.1);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 16px;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
  align-items: center;
  padding: 10px 4px;
  cursor: default;
}

.bubble {
  padding: 10px 20px;
  border-radius: 50px;
  color: white;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
  flex-shrink: 0;
  opacity: 0.88;
  transform-origin: center center;
  will-change: transform, opacity;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>

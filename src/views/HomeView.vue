<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import InstagramIcon from '@/components/common/icons/instagram.vue'
import HomeSidebar from '@/components/home/HomeSidebar.vue'
import HomeDock from '@/components/home/HomeDock.vue'
import HomeFooter from '@/components/home/HomeFooter.vue'
import { consumeDirectRootEntrance } from '@/composables/useRootEntrance'
import { instagramUrl, schoolUrl } from '@/config/social'

const { t } = useI18n()
const detailItems = ['date', 'venue', 'admission'] as const

const entrance = ref(false)
onMounted(() => {
  entrance.value = consumeDirectRootEntrance()
})
</script>

<template>
  <main class="home">
    <section id="top" class="key-visual" :class="{ 'is-entrance': entrance }">
      <figure class="frame">
        <img src="/home/lpf-2026-key-visual - 01.jpg" :alt="t('home.keyVisual.label')" />
      </figure>
    </section>

    <section id="about" class="about">
      <h2 class="title">{{ t('home.about.title') }}</h2>
    </section>

    <section id="information" class="details">
      <h2 class="title">{{ t('home.details.title') }}</h2>
      <dl class="list">
        <div v-for="item in detailItems" :key="item" class="row">
          <dt>{{ t(`home.details.${item}.label`) }}</dt>
          <dd>{{ t(`home.details.${item}.value`) }}</dd>
        </div>
      </dl>
    </section>

    <section id="contact" class="contact">
      <h2 class="title">{{ t('home.contact.title') }}</h2>
      <p class="lead">{{ t('home.contact.lead') }}</p>
      <div class="links">
        <a class="link" :href="instagramUrl" target="_blank" rel="noopener noreferrer">
          <InstagramIcon />
          <span>{{ t('home.contact.instagram') }}</span>
        </a>
        <a class="link" :href="schoolUrl" target="_blank" rel="noopener noreferrer">
          <span>{{ t('home.contact.school') }}</span>
        </a>
      </div>
    </section>

    <HomeFooter />

    <HomeSidebar :entrance="entrance" />
    <HomeDock />
  </main>
</template>

<style scoped>
.home {
  row-gap: 32px;
  padding-top: 0;

  & > *:not(.key-visual) {
    padding-inline: 16px;
  }

  & > section[id] {
    scroll-margin-top: var(--header-height);
  }
}

.key-visual {
  display: flex;
  justify-content: center;
  max-height: 100svh;

  .frame {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    max-width: 1024px;
    min-height: 100svh;
    max-height: min(100vh - var(--header-height), 1024px);
    padding-block: var(--header-height);

    @media (max-height: 500px) {
      html[data-orientation='landscape-left'] &,
      html[data-orientation='landscape-right'] & {
        padding-block: 0;
      }
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }

  &.is-entrance .frame img {
    animation: key-visual-reveal 1.3s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
}

@keyframes key-visual-reveal {
  0% {
    opacity: 0;
    transform: scale(1.08);
    filter: blur(14px);
    clip-path: inset(0 0 100% 0);
  }
  55% {
    opacity: 1;
    clip-path: inset(0 0 0 0);
  }
  100% {
    opacity: 1;
    transform: scale(1);
    filter: blur(0);
    clip-path: inset(0 0 0 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .key-visual.is-entrance .frame img {
    animation: none;
  }
}

.about {
  text-align: center;

  .title {
    font-size: clamp(2rem, 6vw, 3rem);
  }
}

.details {
  text-align: center;

  .list {
    max-width: 400px;
    margin: 20px auto 0;

    .row {
      display: grid;
      grid-template-columns: 120px 1fr;
      gap: 16px;
      padding: 16px 0;
      border-top: 1px solid var(--color-border);

      &:last-child {
        border-bottom: 1px solid var(--color-border);
      }

      dt {
        color: var(--color-text-mute);
      }

      dd {
        margin: 0;
        color: var(--color-heading);
      }
    }
  }

  @media (max-width: 480px) {
    .list .row {
      grid-template-columns: 96px 1fr;
      gap: 12px;
    }
  }
}

.contact {
  text-align: center;

  .lead {
    margin-top: 12px;
    color: var(--color-text-mute);
  }

  .links {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 12px;
    margin-top: 20px;

    .link {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      border: 1px solid var(--color-border);
      border-radius: 999px;
      color: var(--color-text);
      transition:
        border-color 0.15s,
        color 0.15s;

      &:hover {
        border-color: var(--color-border-hover);
        color: var(--color-heading);
      }
    }
  }
}

.title {
  font-size: clamp(1.5rem, 4vw, 2rem);
  font-weight: 500;
  letter-spacing: -0.02em;
  color: var(--color-heading);
}
</style>

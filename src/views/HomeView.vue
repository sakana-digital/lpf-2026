<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import HomeSidebar from '@/components/home/HomeSidebar.vue'
import HomeDock from '@/components/home/HomeDock.vue'
import HomeFooter from '@/components/home/HomeFooter.vue'
import { consumeDirectRootEntrance } from '@/composables/useRootEntrance'
import { formatFestivalPeriod } from '@/config/festival'

const { t, tm, rt, locale } = useI18n()
const detailItems = ['date', 'venue', 'admission'] as const

const festivalPeriod = computed(() => formatFestivalPeriod(locale.value))
const notes = computed(() => (tm('home.notes.items') as string[]).map((note) => rt(note)))

const entrance = ref(false)
onMounted(() => {
  entrance.value = consumeDirectRootEntrance()
})
</script>

<template>
  <main class="home">
    <section id="top" class="key-visual" :class="{ 'is-entrance': entrance }">
      <figure class="frame">
        <img src="/posters/lpf-2026-main.jpg" :alt="t('home.keyVisual.label')" />
      </figure>
    </section>

    <section id="about" class="about">
      <h2 class="title">{{ t('home.about.title') }}</h2>
      <p class="period">{{ festivalPeriod }}</p>
    </section>

    <section id="overview" class="details split">
      <h2 class="title">{{ t('home.details.title') }}</h2>
      <dl class="list">
        <div v-for="item in detailItems" :key="item" class="row">
          <dt>{{ t(`home.details.${item}.label`) }}</dt>
          <dd>
            <span class="value">{{
              item === 'date' ? festivalPeriod : t(`home.details.${item}.value`)
            }}</span>
            <span class="note">{{ t(`home.details.${item}.note`) }}</span>
          </dd>
        </div>
      </dl>
    </section>

    <section id="notes" class="notes split">
      <h2 class="title">{{ t('home.notes.title') }}</h2>
      <ul class="notes-list">
        <li v-for="(note, index) in notes" :key="index">{{ note }}</li>
      </ul>
    </section>

    <section id="contact" class="contact split">
      <h2 class="title">{{ t('home.contact.title') }}</h2>
    </section>

    <HomeFooter />

    <HomeSidebar :entrance="entrance" />
    <HomeDock />
  </main>
</template>

<style scoped>
.home {
  row-gap: 128px;
  padding-top: 0;

  & > *:not(.key-visual):not(.toc) {
    padding-inline: 16px;
  }

  & > section[id] {
    scroll-margin-top: calc(var(--header-height) + 72px);
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

  .period {
    margin-top: 12px;
    font-size: clamp(1rem, 3vw, 1.25rem);
    letter-spacing: 0.04em;
    color: var(--color-text-mute);
  }
}

.split {
  display: grid;
  grid-template-columns: minmax(0, 200px) minmax(0, 1fr);
  column-gap: 48px;
  align-items: center;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
    row-gap: 16px;
  }
}

.details {
  .list {
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
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin: 0;

        .value {
          color: var(--color-heading);
        }

        .note {
          font-size: 13px;
          color: var(--color-text-mute);
        }
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

.notes {
  align-items: start;

  .notes-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 0;
    margin: 0;
    list-style: none;

    li {
      position: relative;
      padding-left: 20px;
      line-height: 1.7;
      color: var(--color-text);

      &::before {
        content: '';
        position: absolute;
        top: 0.7em;
        left: 0;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--color-text-mute);
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

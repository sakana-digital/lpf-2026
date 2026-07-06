<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import HomeSidebar from '@/components/home/HomeSidebar.vue'
import HomeDock from '@/components/home/HomeDock.vue'
import HomeFooter from '@/components/home/HomeFooter.vue'
import InstagramEmbed from '@/components/news/InstagramEmbed.vue'
import NewsLinkCard from '@/components/news/NewsLinkCard.vue'
import { consumeDirectRootEntrance } from '@/composables/useRootEntrance'
import { processInstagramEmbeds } from '@/composables/useInstagramEmbed'
import { formatFestivalPeriod } from '@/config/festival'
import { newsLinks } from '@/config/newsLinks'

const { t, tm, rt, locale } = useI18n()
const overviewItems = ['date', 'venue', 'admission'] as const
const contactItems = ['school', 'address', 'phone'] as const
const mapUrl = 'https://maps.app.goo.gl/HMdtfGcyfxPd2hUT8'
const newsPreview = newsLinks.slice(0, 3)

const festivalPeriod = computed(() => formatFestivalPeriod(locale.value))
const notes = computed(() => (tm('home.notes.items') as string[]).map((note) => rt(note)))
const newsPath = computed(() => (locale.value === 'en' ? '/en/news' : '/news'))

const entrance = ref(false)
onMounted(() => {
  entrance.value = consumeDirectRootEntrance()
  if (newsPreview.length > 0) processInstagramEmbeds()
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
      <p class="subtitle">{{ t('home.about.subtitle') }}</p>
      <p class="period">{{ festivalPeriod }}</p>
    </section>

    <section id="overview" class="overview split">
      <h2 class="title">{{ t('home.overview.title') }}</h2>
      <dl class="list">
        <div v-for="item in overviewItems" :key="item" class="row">
          <dt>{{ t(`home.overview.${item}.label`) }}</dt>
          <dd>
            <span class="value">{{
              item === 'date' ? festivalPeriod : t(`home.overview.${item}.value`)
            }}</span>
            <span class="note">{{ t(`home.overview.${item}.note`) }}</span>
          </dd>
        </div>
      </dl>
    </section>

    <section id="access" class="access split">
      <h2 class="title">{{ t('home.access.title') }}</h2>
      <div class="access-body">
        <div class="location">
          <div class="info">
            <p class="venue">{{ t('home.access.venue') }}</p>
            <p class="address">{{ t('home.access.address') }}</p>
          </div>
          <p class="station">{{ t('home.access.station') }}</p>
        </div>
        <a class="pill-button" :href="mapUrl" target="_blank" rel="noopener noreferrer">
          {{ t('home.access.map') }}
        </a>
      </div>
    </section>

    <section id="news" class="news-section split">
      <h2 class="title">{{ t('home.news.title') }}</h2>
      <div class="news-body">
        <div v-if="newsPreview.length > 0" class="news-grid">
          <template v-for="item in newsPreview" :key="item.url">
            <InstagramEmbed v-if="item.type === 'instagram'" :url="item.url" />
            <NewsLinkCard v-else :url="item.url" :title-key="item.titleKey" :source="item.source" />
          </template>
        </div>
        <p v-else class="empty">{{ t('home.news.empty') }}</p>
        <RouterLink class="pill-button" :to="newsPath">
          {{ t('home.news.more') }}
        </RouterLink>
      </div>
    </section>

    <section id="notes" class="notes split">
      <h2 class="title">{{ t('home.notes.title') }}</h2>
      <ul class="notes-list">
        <li v-for="(note, index) in notes" :key="index">{{ note }}</li>
      </ul>
    </section>

    <section id="contact" class="contact split">
      <h2 class="title">{{ t('home.contact.title') }}</h2>
      <div class="contact-body">
        <p class="lead">{{ t('home.contact.lead') }}</p>
        <dl class="list">
          <div v-for="item in contactItems" :key="item" class="row">
            <dt>{{ t(`home.contact.${item}.label`) }}</dt>
            <dd>{{ t(`home.contact.${item}.value`) }}</dd>
          </div>
        </dl>
      </div>
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
    white-space: pre-line;
  }

  .subtitle {
    margin-top: 16px;
    font-size: clamp(0.875rem, 2.5vw, 1rem);
    letter-spacing: 0.02em;
    color: var(--color-text);
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

.pill-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 999px;
  background: var(--color-heading);
  color: var(--color-background);
  font-size: 14px;
  letter-spacing: 0.02em;
  text-decoration: none;
  transition: opacity 0.15s;

  &:hover {
    opacity: 0.85;
  }
}

.title {
  font-size: clamp(1.5rem, 4vw, 2rem);
  font-weight: 500;
  letter-spacing: -0.02em;
  color: var(--color-heading);
}

.overview {
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

.access {
  align-items: start;

  .access-body {
    display: flex;
    flex-direction: column;
    align-items: start;
    gap: 6px;
    width: 100%;
  }

  .location {
    display: flex;
    align-items: stretch;
    gap: 16px;
    width: 100%;

    @media (max-width: 600px) {
      flex-direction: column;
      gap: 10px;
    }
  }

  .info {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
  }

  .venue {
    margin: 0;
    color: var(--color-heading);
  }

  .address {
    margin: 0;
    font-size: 13px;
    color: var(--color-text-mute);
  }

  .station {
    display: flex;
    align-items: center;
    flex: 1;
    margin: 0;
    padding-left: 16px;
    border-left: 2px solid var(--color-heading);
    font-size: 15px;
  }

  .pill-button {
    align-self: center;
    margin-top: 14px;
  }
}

.news-section {
  align-items: start;

  .news-body {
    display: flex;
    flex-direction: column;
    align-items: start;
    gap: 24px;
    width: 100%;
  }

  .news-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(326px, 100%), 1fr));
    gap: 16px;
    width: 100%;
  }

  .pill-button {
    align-self: center;
  }

  .empty {
    margin: 0;
    color: var(--color-text-mute);
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

.contact {
  align-items: start;

  .contact-body {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .lead {
    margin: 0;
    line-height: 1.7;
    color: var(--color-text);
  }

  .list .row {
    display: grid;
    grid-template-columns: 96px 1fr;
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
</style>

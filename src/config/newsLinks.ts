export type NewsItem =
  | { type: 'instagram'; url: string }
  | { type: 'link'; url: string; titleKey: string; source: 'school' }

export const newsLinks: NewsItem[] = [
  { type: 'instagram', url: 'https://www.instagram.com/p/DaaLdsfypB5/' },
  { type: 'instagram', url: 'https://www.instagram.com/p/DaHRKF9Sh_k/' },
  { type: 'instagram', url: 'https://www.instagram.com/p/DaCxgl5Slr6/' },
  { type: 'instagram', url: 'https://www.instagram.com/p/DaCxQjrEkIi/' },
  {
    type: 'link',
    url: 'https://www.pen-kanagawa.ed.jp/kanagawasogosangyo-h/zennichi/nyugaku/setsumeikai.html',
    titleKey: 'news.links.setsumeikai',
    source: 'school',
  },
  {
    type: 'link',
    url: 'https://www.pen-kanagawa.ed.jp/kanagawasogosangyo-h/zennichi/seikatsu/bunkasai.html',
    titleKey: 'news.links.bunkasai',
    source: 'school',
  },
]

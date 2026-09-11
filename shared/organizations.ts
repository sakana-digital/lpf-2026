import type { LocalizedText } from './locale'
import type { Venue } from './venues'

export const grades = [1, 2, 3] as const
export const classNumbers = [1, 2, 3, 4, 5, 6, 7, 8] as const
/** Clubs and committees are numbered in the order they first answered the description form. */
export const clubNumbers = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
] as const
export const committeeNumbers = [1, 2, 3] as const
/**
 * Volunteer groups are what the festival committee files everything that is
 * neither a class, a club nor a committee under: bands, the supporters,
 * a research team. Numbered in the order the printed programme lists them.
 */
export const volunteerNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const

export type Grade = (typeof grades)[number]
export type ClassNumber = (typeof classNumbers)[number]
export type ClubNumber = (typeof clubNumbers)[number]
export type CommitteeNumber = (typeof committeeNumbers)[number]
export type VolunteerNumber = (typeof volunteerNumbers)[number]

export type ClassOrgId = `c${Grade}-${ClassNumber}`
export type ClubOrgId = `club-${ClubNumber}`
export type CommitteeOrgId = `com-${CommitteeNumber}`
export type VolunteerOrgId = `vol-${VolunteerNumber}`
export type OrgId = ClassOrgId | ClubOrgId | CommitteeOrgId | VolunteerOrgId

/*
 * The return types below are annotated on purpose: without them TypeScript widens
 * the template literal to string, and organizationProfiles stops rejecting typos.
 */

export function classOrgId(grade: Grade, classNo: ClassNumber): ClassOrgId {
  return `c${grade}-${classNo}`
}

export function clubOrgId(no: ClubNumber): ClubOrgId {
  return `club-${no}`
}

export function committeeOrgId(no: CommitteeNumber): CommitteeOrgId {
  return `com-${no}`
}

export function volunteerOrgId(no: VolunteerNumber): VolunteerOrgId {
  return `vol-${no}`
}

export const orgIds: readonly OrgId[] = [
  ...grades.flatMap((grade) => classNumbers.map((classNo) => classOrgId(grade, classNo))),
  ...clubNumbers.map((no) => clubOrgId(no)),
  ...committeeNumbers.map((no) => committeeOrgId(no)),
  ...volunteerNumbers.map((no) => volunteerOrgId(no)),
]

const orgIdSet: ReadonlySet<string> = new Set(orgIds)

export function isOrgId(id: string): id is OrgId {
  return orgIdSet.has(id)
}

/** Tents are lettered from the east end of the courtyard, the north row before the south. */
export const tentLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const

export type TentLetter = (typeof tentLetters)[number]

/**
 * Where a group runs its project. Rooms carry their floor in the leading digit,
 * the stage and the AV room are the timetable venues, and anything one group
 * alone uses is spelled out instead of being modelled.
 */
export type OrgPlace =
  | { kind: 'room'; room: string }
  | { kind: 'tent'; tent: TentLetter }
  | { kind: 'venue'; venue: Venue }
  | { kind: 'named'; name: LocalizedText }

export function room(room: string): OrgPlace {
  return { kind: 'room', room }
}

export function tent(tent: TentLetter): OrgPlace {
  return { kind: 'tent', tent }
}

export function venue(venue: Venue): OrgPlace {
  return { kind: 'venue', venue }
}

export const STAGE = venue('courtyard')

export function named(name: LocalizedText): OrgPlace {
  return { kind: 'named', name }
}

/**
 * The festival committee files every project under a division and, within it,
 * what the group actually runs; the printed programme uses both. Clubs are
 * listed by the latter, and the events grid can regroup every kind by it, so a
 * class cooking in a tent sits with every other tent. Add a key here plus its
 * two locale labels.
 */
export const ORG_DIVISIONS = ['variety', 'market', 'performance'] as const

export type OrgDivision = (typeof ORG_DIVISIONS)[number]

export const ORG_CATEGORIES = [
  'experience',
  'foodSales',
  'cooking',
  'otherSales',
  'presentation',
] as const

export type OrgCategory = (typeof ORG_CATEGORIES)[number]

/** The eight allergens Japanese labelling law requires to be declared. */
export const MANDATORY_ALLERGENS = [
  'shrimp',
  'crab',
  'walnut',
  'wheat',
  'buckwheat',
  'egg',
  'milk',
  'peanut',
] as const

/** The twenty further allergens the law only recommends declaring. */
export const OPTIONAL_ALLERGENS = [
  'almond',
  'abalone',
  'squid',
  'salmonRoe',
  'orange',
  'cashew',
  'kiwi',
  'beef',
  'sesame',
  'salmon',
  'mackerel',
  'soybean',
  'chicken',
  'banana',
  'pork',
  'matsutake',
  'peach',
  'yam',
  'apple',
  'gelatin',
] as const

export const ALLERGENS = [...MANDATORY_ALLERGENS, ...OPTIONAL_ALLERGENS] as const

export type Allergen = (typeof ALLERGENS)[number]

export interface MenuItem {
  name: LocalizedText
  /** Yen. Left unset while the price is undecided. */
  price?: number
  /**
   * An empty array means the group declared the item free of every allergen
   * above, while leaving this unset means it has declared nothing yet. The two
   * must never be collapsed: only the former is safe to present as allergen-free.
   */
  allergens?: readonly Allergen[]
}

export interface OrganizationProfile {
  /** Group name. Classes are labelled from their grade and class number instead. */
  name?: LocalizedText
  /** Name of the project the group runs. */
  project?: LocalizedText
  division?: OrgDivision
  category?: OrgCategory
  /** Where the group runs it. Unset while the place is undecided. */
  place?: OrgPlace
  description?: LocalizedText
  /**
   * File name under the website's assets/orgs/, around 800px on the long side, with
   * smaller copies under <width>/. 4:3 fills the frame and any other ratio is fitted inside it.
   */
  image?: string
  imageAlt?: LocalizedText
  /** Set by the groups serving food; its presence is what marks them as such. */
  menus?: readonly MenuItem[]
}

/**
 * Every public detail of a group. The site and the signage both read this, so a
 * name decided here shows up in both. Groups left out have nothing decided yet.
 */
export const organizationProfiles: Partial<Record<OrgId, OrganizationProfile>> = {
  'c1-1': {
    project: { ja: 'ボウリング' },
    division: 'variety',
    category: 'experience',
    place: room('401'),
    description: {
      ja: '1-1はボウリングをします！会場にくれば普通では考えられない曲がったコースやラグビーボールなどでできるコースもあるので是非来てください！',
    },
    image: 'c1-1.webp',
  },
  'c1-2': {
    project: { ja: '不思議な国の玉入れコースター' },
    division: 'variety',
    category: 'experience',
    place: room('402'),
    description: {
      ja: '402にて不思議の国をモチーフにした玉入れを体験できます！とてもエキサイティングです！高得点でランキングに載れば豪華なお菓子ゲットです！',
    },
    image: 'c1-2.webp',
  },
  'c1-3': {
    project: { ja: 'きもだめし' },
    division: 'variety',
    category: 'experience',
    place: room('403'),
    description: {
      ja: '縁結びの神社　幸せをくれると噂の場所…\nしかし突然と闇に包まれ、入ってしまったら2度と出てこれないという噂…\nそしていつの間にか忘れられた場所となった。\n真の幸せを見つけたい人はまだ通うと言うが、見つけられなかった人はまださ迷ってる噂\n1年3組でシアワセを見つけてね',
    },
    image: 'c1-3.webp',
  },
  'c1-4': {
    project: { ja: 'くまベガス' },
    division: 'variety',
    category: 'experience',
    place: room('404'),
    description: {
      ja: 'ようこそクマベガスへ！ここはアメリカンな運試しの街！参加するだけで駄菓子をGET♪さらに勝者には追加の景品も！友達と一緒に挑戦しよう！',
    },
    image: 'c1-4.webp',
  },
  'c1-5': {
    project: { ja: '鉱山からの脱出' },
    division: 'variety',
    category: 'experience',
    place: room('405'),
    description: {
      ja: '1年5組です！ we は「鉱山」をテーマにした脱出迷路を開催します。迷路の中に隠された文字をすべて集めると、素敵な景品をプレゼント！ぜひ体験しに来てください！',
    },
    image: 'c1-5.webp',
  },
  'c1-6': {
    project: { ja: 'ボールターガイスド' },
    division: 'variety',
    category: 'experience',
    place: room('406'),
    description: {
      ja: 'お化け屋敷、ボールコースター、フォトブース、3つ合わせるとむっちゃスゲー出し物ができる…？！そう！ボールターガイスト！略してBTG！406にいらっしゃい！',
    },
    image: 'c1-6.webp',
  },
  'c1-7': {
    project: { ja: 'カジノ・ヨダベガス' },
    division: 'variety',
    category: 'experience',
    place: room('201'),
    description: {
      ja: '私たちはカジノをします\nカードゲームやサイコロなどをやっています\nみんなで盛り上がりたい方ギャンブルでひりつきたい方など、全ての人を待ってます！',
    },
    image: 'c1-7.webp',
  },
  'c1-8': {
    project: { ja: '射的プラネタリウム' },
    division: 'variety',
    category: 'experience',
    place: room('202'),
    description: {
      ja: '私たちは、プラネタリウムをイメージした空間で射的を楽しめる企画をします！星や惑星を狙って挑戦しよう！',
    },
    image: 'c1-8.webp',
  },
  'c2-1': {
    project: { ja: 'ネームプレート作り体験' },
    division: 'variety',
    category: 'experience',
    place: room('301'),
    description: {
      ja: '自分だけのキーホルダーを作ってみませんか？「LISAクラフト工房」では、キーホルダーのデコレーションや打刻体験ができます！ぜひ遊びに来てください！',
    },
    image: 'c2-1.webp',
  },
  'c2-2': {
    project: { ja: 'I want two win!' },
    division: 'variety',
    category: 'experience',
    place: room('302'),
    description: {
      ja: '事前に撮影した生徒たちのレース動画を見て誰かつか予想する参加型ゲーム企画です！誰でも無料で楽しめます！的中者には景品も！気軽にお立ち寄りください！',
    },
    image: 'c2-2.webp',
  },
  'c2-3': {
    project: { ja: 'プラネタリウムカフェ' },
    division: 'market',
    category: 'foodSales',
    place: room('303'),
    description: {
      ja: '私たちはプラネタリウムカフェをします！カフェの中では綺麗なプラネタリウムを眺めながら飲み物を飲んだり、カップケーキを食べられます！気になったらぜひお立ち寄りください！',
    },
    image: 'c2-3.webp',
  },
  'c2-4': {
    project: { ja: 'LiSAシューティング' },
    division: 'variety',
    category: 'experience',
    place: room('304'),
    description: {
      ja: '2年4組では、某トイのストーリーをモチーフにした的当てアトラクションを開催します。カートに乗って部屋の中を進みながら、さまざまな的を狙います。ぜひ304教室へお越しください！',
    },
    image: 'c2-4.webp',
  },
  'c2-5': {
    project: { ja: '喫茶2525' },
    division: 'market',
    category: 'foodSales',
    place: room('305'),
    description: {
      ja: '私たちは305にて、コーヒーゼリーとバニラアイス、飲み物にはメロンソーダを提供しております！\n賑やかな文化祭ですが、休憩には落ち着いた喫茶店へというのもいかがですか？',
    },
    image: 'c2-5.webp',
  },
  'c2-6': {
    project: { ja: 'The Mocktail Lab' },
    division: 'market',
    category: 'foodSales',
    place: room('203'),
    description: {
      ja: '〜大人の隠れ家味わいませんか？〜\n\n今宵の文化祭にひと味違った空間を\n特別なドリンクとともに203教室にて\nお待ちしております。',
    },
    image: 'c2-6.webp',
  },
  'c2-7': {
    project: { ja: '石ーソン' },
    division: 'market',
    category: 'foodSales',
    place: room('204'),
    description: {
      ja: '私たち2-7はコンビニ「石ーソン」を営業します！お菓子や飲み物など、さまざまな商品を販売します。ぜひお立ち寄りください！',
    },
    image: 'c2-7.webp',
  },
  'c2-8': {
    project: { ja: '2-8写真館' },
    division: 'variety',
    category: 'experience',
    place: room('308'),
    description: {
      ja: '私達は人魚姫やマッチ売りの少女をモチーフにしたフォトスポットを展示します！貝殻の浮き輪で映え写真、マッチ（多様性）売りの少女のネタ写真などが楽しめます！ぜひ来てください！',
    },
    image: 'c2-8.webp',
  },
  'c3-1': {
    project: { ja: 'マインクラフト焼き鳥屋さん' },
    division: 'market',
    category: 'cooking',
    place: tent('A'),
    description: {
      ja: 'マイクラ焼き鳥ではタレ・塩のモモを提供！七味と胡椒もかけ放題です！(無くなり次第終了)四角い世界で焼き鳥を食べてみませんか？',
    },
    image: 'c3-1.webp',
  },
  'c3-2': {
    project: { ja: 'オカードパパのカスティーラ工房' },
    division: 'market',
    category: 'cooking',
    place: tent('C'),
    description: {
      ja: '2026年9月26~27日、LiSA高の中庭テントにオカードパパ監修のベビーカステラ屋さんが上陸!\nほらほら甘いもの食べたくなってきたでしょう?ぜひ来てください!',
    },
    image: 'c3-2.webp',
  },
  'c3-3': {
    project: { ja: '元祖渋谷堂' },
    division: 'market',
    category: 'cooking',
    place: tent('B'),
    description: {
      ja: '汁なし、妥協なし。混ぜれば混ぜるほど美味しくなる、『元祖渋谷堂』自慢の油そば。\n文化祭でしか味わえない一杯を中庭テントでどうぞ！',
    },
    image: 'c3-3.webp',
  },
  'c3-4': {
    project: { ja: 'ゾミゾミバーガー' },
    division: 'market',
    category: 'cooking',
    place: tent('D'),
    description: {
      ja: '私達はハンバーガーと飲み物を提供してます！\nハンバーガーと飲み物をそれぞれ4種類販売しています。\n喉が乾いたりお腹がすいた時には是非中庭テントにお立ち寄りください！',
    },
    image: 'c3-4.webp',
  },
  'c3-5': {
    project: { ja: '山下ホイップサンド' },
    division: 'market',
    category: 'cooking',
    place: tent('F'),
    description: {
      ja: '私たち3-5はホイップサンドを中庭テントにて販売しております！自由にカスタムできますのでみなさん甘くて美味しいホイップサンドをぜひ食べにきてください！！',
    },
  },
  'c3-6': {
    project: { ja: 'グランメゾンMISAKI' },
    division: 'market',
    category: 'cooking',
    place: tent('E'),
    description: {
      ja: '一流シェフ……ではなく、三年六組のメンバーが心を込めてタコスを作ります！お腹を空かせてご来店ください！ぼなぺてぃ！',
    },
    image: 'c3-6.webp',
  },
  'c3-7': {
    project: { ja: 'ケイタリングカー 〜Kebab&Chips〜' },
    division: 'market',
    category: 'cooking',
    place: tent('H'),
    description: {
      ja: 'SNSで話題の、ポテチとケバブの合わさった新感覚の「ケバブチップス」と冷た～い飲み物をご用意してます！一度食べたらやみつき間違いなし！中庭緑のトラックが目印です',
    },
    image: 'c3-7.webp',
  },
  'c3-8': {
    project: { ja: 'イケnightかき氷' },
    division: 'market',
    category: 'cooking',
    place: tent('G'),
    description: {
      ja: '私たちのかき氷ではフレーバー四種、トッピング三種、限定フレーバー二種を提供します。トッピングにはパチパチパニックも！？なんと、限定フレーバーにはキャラメルバニラ！ぜひきてください',
    },
    image: 'c3-8.webp',
  },
  'club-1': {
    name: { ja: 'ジャズバンド部' },
    project: { ja: 'ジャズすぎて滅！' },
    division: 'performance',
    category: 'presentation',
    place: STAGE,
    description: {
      ja: 'みなさん、文化祭楽しんでますか？\nそんなあなたに、ジャズバンド部！\n企画名はジャズすぎて滅\n最高の音楽で会場を沸かせます！\n文化祭1日目中庭ステージです',
    },
    image: 'jazz-band.webp',
  },
  'club-2': {
    name: { ja: '弓道部' },
    project: { ja: '弓道体験' },
    division: 'variety',
    category: 'experience',
    place: named({ ja: '弓道場' }),
    description: {
      ja: '弓道部です。弓道場で”的当て”をやっています！無料です！的に当たった数により、お菓子をプレゼント。ぜひ、この機会に弓を引いてみませんか？',
    },
    image: 'kyudo.webp',
  },
  'club-3': {
    name: { ja: 'デザイン造形部' },
    project: { ja: 'キミ色ビーズブレスレット' },
    division: 'variety',
    category: 'experience',
    place: room('206'),
    description: {
      ja: '私たちはビーズブレスレット作りを開催します！2階の206教室で行います。\n自分だけのオリジナルブレスレットが作れるので、思い出作りにぜひお立ち寄りください！',
    },
    image: 'design-modeling.webp',
  },
  'club-4': {
    name: { ja: '自動車同好会' },
    project: { ja: 'Liサーキット' },
    division: 'variety',
    category: 'experience',
    place: named({ ja: '校庭・10E' }),
    description: {
      ja: '私たちは日々の活動で修理、整備したマイクロカーを実際に乗って走行できる、走行体験を校庭で実施しています！！1日目限定なので、ぜひお気軽に校庭へお立ち寄りください！',
    },
    image: 'automobile.webp',
  },
  'club-5': {
    name: { ja: '漫画研究部' },
    project: { ja: '漫研ストア' },
    division: 'market',
    category: 'otherSales',
    place: room('207'),
    description: {
      ja: '漫画研究部員が一生懸命作った、LISA限定のオリジナルグッズを207教室にて販売中!今年はアクリルキーホルダー制作にも挑戦しているので、ぜひ気軽にお立ち寄りください!',
    },
    image: 'manga-research.webp',
  },
  'club-6': {
    name: { ja: '美術部' },
    project: { ja: 'ワクわく美術部' },
    division: 'variety',
    category: 'experience',
    place: named({ ja: '美術室' }),
    description: {
      ja: '絵、模型など多数展示してます！\n共同作、課研作品なども！\n3階上がってすぐの美術室に、ぜひお立ち寄りを！',
    },
    image: 'art.webp',
  },
  'club-7': {
    name: { ja: 'ロボメック研究部' },
    project: { ja: 'ロボット展覧会' },
    division: 'variety',
    category: 'experience',
    place: room('407'),
    description: {
      ja: '私たちはこれまでに部活動で作成したロボットを407教室にて展示します。ぜひロボットを見に来てください',
    },
    image: 'robomech.webp',
  },
  'club-8': {
    name: { ja: '山岳部' },
    project: { ja: '山岳部展示会 〜山の魂〜' },
    division: 'variety',
    category: 'experience',
    place: room('205'),
    description: {
      ja: '私たちは山岳部です！教室内にテントを設営し、実際に使用する登山装備や大自然の中での活動の様子を公開中！ぜひ山岳部の魅力を体感しに来てください！',
    },
    image: 'mountaineering.webp',
  },
  'club-9': {
    name: { ja: '囲碁将棋部' },
    project: { ja: 'LiSA将棋部' },
    division: 'variety',
    category: 'experience',
    place: room('408'),
    description: {
      ja: '初心者の方に向けた将棋の指し方の解説をします！\n一日二回、10時と14時から一時間程度を予定してます！\n文化祭を周り尽くして暇だな、そう思ったら是非お立ち寄りください！',
    },
    image: 'go-shogi.webp',
  },
  'club-10': {
    name: { ja: '機械部' },
    project: { ja: '真鍮に夢中' },
    division: 'market',
    category: 'otherSales',
    place: room('10C'),
    description: {
      ja: '工業機械を用いて作った真鍮製品や、はんだで作ったステンドグラスアクセサリーを販売します！工業機械を見に来るだけでも結構なので、ぜひ気軽に来てください！',
    },
    image: 'machinery.webp',
  },
  'club-11': {
    name: { ja: 'アコースティックギター部' },
    project: { ja: 'unplugged live' },
    division: 'performance',
    category: 'presentation',
    place: named({ ja: '中庭ステージ・20B（鵜の森亭）' }),
    description: {
      ja: '私たちアコギ部は中庭ステージと鵜の森亭でライブを行います！中庭ステージでは部員全員で演奏します！ほかの部活には無い魅力があるので、是非見に来てください！',
    },
    image: 'acoustic-guitar.webp',
  },
  'club-12': {
    name: { ja: '演劇部' },
    project: { ja: '天を翔けたなら' },
    division: 'performance',
    category: 'presentation',
    place: venue('avRoom'),
    description: {
      ja: '天使の世界で片翼しかない主人公、リベルタが森の中で出会った少女と関わる中で自分らしさと向き合い進んでいく物語。視聴覚室にて公演します。ぜひお越しください。',
    },
    image: 'drama.webp',
  },
  'club-13': {
    name: { ja: '化学工学部' },
    project: { ja: 'LiScience' },
    division: 'variety',
    category: 'experience',
    place: room('20C'),
    description: {
      ja: '化学工学部では実験器具やポスターの展示から、蛍石など身近な物の展示を行っています。午前と午後には実験ショーや体験も出来ます！227、237でお待ちしてます。',
    },
    image: 'chemical-engineering.webp',
  },
  'club-14': {
    name: { ja: 'エレクトロニクス部' },
    project: { ja: '無題の作品.ele' },
    division: 'variety',
    category: 'experience',
    place: room('307'),
    description: {
      ja: 'アニメーションやCGモデリング、プログラミング、ボカロ調声、物理デバイス作成など幅広く活動しています。307教室で部員の作品展示中ですので是非お越しください！',
    },
    image: 'electronics.webp',
  },
  'club-15': {
    name: { ja: '日本文化部' },
    project: { ja: 'お茶会' },
    division: 'variety',
    category: 'experience',
    place: named({ ja: '書道室' }),
    description: {
      ja: '私たちは無料でお茶とお菓子を提供しています。4階書道室で11〜12時、14〜15時でお点前を見ながらお茶とお菓子を楽しめます。部誌も配布してるのでぜひお立ち寄り下さい',
    },
    image: 'japanese-culture.webp',
  },
  'club-16': {
    name: { ja: '写真部' },
    project: { ja: 'LiSA写真部' },
    division: 'variety',
    category: 'experience',
    place: room('208'),
    description: {
      ja: '写真の展示とプチ休憩所をご用意しております！\n写真の世界へごゆっくりどうぞ〜',
    },
    image: 'photography.webp',
  },
  'club-17': {
    name: { ja: 'ダンス部' },
    project: { ja: 'DANCE' },
    division: 'performance',
    category: 'presentation',
    place: STAGE,
    description: {
      ja: 'こんにちは！ダンス部です。\n私たちは2日間、中庭ステージでかっこよく、魅力いっぱいのダンスを披露します。ぜひご覧ください！',
    },
    image: 'dance.webp',
  },
  'club-18': {
    name: { ja: '大道芸部' },
    project: { ja: '大道芸パフォーマンス' },
    division: 'performance',
    category: 'presentation',
    place: STAGE,
    description: {
      ja: '中庭ステージで大道芸パフォーマンスを行います！\n去年よりもパワーアップした技や構成にご注目ください。\nパフォーマンス中に作成したバルーンアートは観客の方にお渡しいたします！',
    },
    image: 'street-performance.webp',
  },
  'club-19': {
    name: { ja: '鉄道研究部' },
    project: { ja: 'LiSA EXPRESS' },
    division: 'variety',
    category: 'experience',
    place: room('306'),
    description: {
      ja: '模型・シミュレーションの運転体験やクイズ大会をやってます！正解数に応じて景品も変わってくるのでぜひ来てください！',
    },
    image: 'railway-research.webp',
  },
  'club-20': {
    name: { ja: '軽音部' },
    project: { ja: 'アオハル MUSIC FEST' },
    division: 'performance',
    category: 'presentation',
    place: STAGE,
    description: {
      ja: '今年も、軽音部から6バンドが出演します！最高なパフォーマンスをお届けします。1日の終わりに、ぜひ、中庭ステージで過ごしましょう！\n青春のひとときを私たちとともに‼',
    },
    image: 'light-music.webp',
  },
  'com-1': {
    name: { ja: '図書委員会' },
    project: { ja: 'そうだ、今年も図書館行こう' },
    division: 'variety',
    category: 'experience',
    place: named({ ja: '図書室' }),
    description: {
      ja: '図書委員会は図書室で栞の制作、先着で製本講習を行っています。わかりやすい内容ですので、どうぞお気軽にお立ち寄りください！',
    },
    image: 'library-committee.webp',
  },
  'com-2': {
    name: { ja: '生徒会' },
    project: { ja: '「リサクエ」勇者達よ、くじを引かないか' },
    division: 'market',
    category: 'otherSales',
    place: room('20D'),
    description: {
      ja: '229教室にて、くじ引きとクイズ大会を開催しております！！是非お立ち寄りください！！',
    },
    image: 'student-council.webp',
  },
  'com-3': {
    name: { ja: '福祉委員会' },
    project: { ja: 'あしなが募金' },
    division: 'variety',
    category: 'experience',
    place: named({ ja: '受付の後ろの柱前' }),
    description: {
      ja: 'あしなが募金を行います。\n募金を行った方には千本引きを行ってもらい、お菓子を差し上げます。ぜひご協力よろしくお願いします。',
    },
    image: 'welfare-committee.webp',
  },
  'vol-1': {
    name: { ja: '連携広報グループ' },
    project: { ja: '学校説明会' },
    division: 'variety',
    category: 'experience',
    place: venue('avRoom'),
    description: {
      ja: '両日とも13:00～　視聴覚室にて、本校の学校説明会を行います。中学生の皆さん、まだ学校説明会に参加したことがない人は、この機会にぜひお越しください！',
    },
    image: 'pr-group.webp',
  },
  'vol-2': {
    name: { ja: 'サポーターズ本部(本部・交通安全委員会・環境美化委員会)' },
    project: { ja: 'お休み処' },
    division: 'market',
    category: 'otherSales',
    place: named({ ja: '会議室' }),
    description: {
      ja: 'サポーターズ本部は今年も東棟1F会議室にてドリンクの無料提供とパンやクッキーの軽食をご用意します♪大好評LiSAグッズの新作も販売します。お休み処でおくつろぎください♪',
    },
    image: 'supporters-hq.webp',
  },
  'vol-3': {
    name: { ja: 'サポーターズふれあい委員会' },
    project: { ja: '縁日' },
    division: 'market',
    category: 'otherSales',
    place: named({ ja: '食堂前' }),
    description: {
      ja: 'ふれあい委員会では、西棟１階学食前で縁日を開催。無料で楽しめる『わなげ』と『はかりゲーム』に挑戦して景品をゲット！どなた様でも大歓迎♪君の感覚とコントロールを試してみない？',
    },
    image: 'supporters-fureai.webp',
  },
  'vol-4': {
    name: { ja: '青春ノイローゼ' },
    project: { ja: '青春ノイローゼ' },
    division: 'performance',
    category: 'presentation',
    place: STAGE,
    image: 'seishun-neurose.webp',
  },
  'vol-5': {
    name: { ja: '初恋前夜のPoppys' },
    project: { ja: '初恋前夜のPoppys' },
    division: 'performance',
    category: 'presentation',
    place: STAGE,
    description: {
      ja: 'こんにちは！初恋前夜のPoppysです！私達は文化祭1日目、中庭ステージで演奏します！甘酸っぱい青春を音楽に乗せて、全力で届けます！ぜひ聴きに来てください！',
    },
    image: 'hatsukoi-zenya-no-poppys.webp',
  },
  'vol-6': {
    name: { ja: '教員有志' },
    project: { ja: 'NON QUALITY' },
    division: 'performance',
    category: 'presentation',
    place: STAGE,
  },
  'vol-7': {
    name: { ja: 'ノーチラス' },
    project: { ja: 'ノーチラス' },
    division: 'performance',
    category: 'presentation',
    place: STAGE,
  },
  'vol-8': {
    name: { ja: 'IRIS＝Hz' },
    project: { ja: 'IRIS＝Hz' },
    division: 'performance',
    category: 'presentation',
    place: STAGE,
  },
  'vol-9': {
    name: { ja: '天然パーマ' },
    project: { ja: '天然パーマ' },
    division: 'performance',
    category: 'presentation',
    place: STAGE,
  },
  'vol-10': {
    name: { ja: '課題研究リベラルアーツマンガ班' },
    project: { ja: '緊急！子供の読解力低下！！〜漫画を読書の入り口に〜' },
    division: 'variety',
    category: 'experience',
    place: room('30A'),
    description: {
      ja: '私達は課題研究の一環として漫画を研究しそれをもとに実際に描いてみました！皆さんに配布しようと思います！！場所は美術室です！！お待ちしています！',
    },
  },
  'vol-11': {
    name: { ja: 'JICA海外研修' },
    project: { ja: '2026年度JICA横浜教師海外研修(inペルー共和国)報告' },
    division: 'variety',
    category: 'presentation',
    place: named({ ja: '東棟3階ラウンジ' }),
    description: {
      ja: '「誰一人取り残さない社会～日系社会の現場から考える～」を研修テーマとし、現地で得た気づきを展示します。ペルーとのつながりを体験できる企画もあります！ぜひお待ちしています！',
    },
    image: 'jica-report.webp',
  },
}

export function organizationProfile(id: string): OrganizationProfile | undefined {
  return isOrgId(id) ? organizationProfiles[id] : undefined
}

export function servesFood(profile: OrganizationProfile | undefined): boolean {
  return (profile?.menus?.length ?? 0) > 0
}

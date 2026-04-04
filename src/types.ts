export interface Speaker {
  id: string
  name: string
  emoji: string
  description: string
  sort_order: number
}

export interface Topic {
  id: string
  speaker_id: string
  text: string
  submitted_by: string
  created_at: string
}

export interface GachaRound {
  id: string
  speaker_id: string
  topic_ids: string[]
  status: 'gacha' | 'voting' | 'closed' | 'archived'
  voting_deadline: string | null
  winner_topic_id: string | null
  created_at: string
}

export interface Vote {
  id: string
  round_id: string
  topic_id: string
  voter_id: string
  created_at: string
}

// Constants
export interface SpeakerLink {
  label: string
  url: string
  icon: string
}

export interface Speaker {
  id: string
  name: string
  emoji: string
  image: string
  color: string
  bg: string
  light: string
  description: string
  sort_order: number
  titles: string[]
  bio: string
  highlights: string[]
  links: SpeakerLink[]
}

export const SPEAKERS: Speaker[] = [
  {
    id: 'match',
    name: '小野マッチスタイル邪兄',
    emoji: '🎤',
    image: '/clay_match.png',
    color: '#ff6b9d',
    bg: '#ffe8f0',
    light: '#fff0f5',
    description: 'YouTubeプロデューサー',
    sort_order: 1,
    titles: [
      'YouTubeプロデューサー / 名アシスタント',
      '世界一ゆるいYouTube大学 学長',
      'お母さんの学校 教頭（人間力大学）',
      'トモダチヲカタセル株式会社 代表取締役',
    ],
    bio: '長野生まれ・長野育ち。カラフルな服を着た派手な髪の人です。櫻庭露樹さんの右にいるやつです。実はいろんな人のYouTubeを担当させてもらってます。',
    highlights: [],
    links: [
      { label: 'Instagram', url: 'https://www.instagram.com/ono_style_match', icon: '📸' },
      { label: '人生V字回復の法則チャンネル', url: 'https://youtube.com/', icon: '▶️' },
    ],
  },
  {
    id: 'nao',
    name: '高橋直寛（なおちゃん）',
    emoji: '📊',
    image: '/clay_nao.png',
    color: '#f7a44c',
    bg: '#fff0db',
    light: '#fff8ed',
    description: 'マーケター / 大嶋啓介マネージャー',
    sort_order: 2,
    titles: [
      '株式会社高橋コンサルティング 代表',
      '大嶋啓介マネージャー',
      '人間力大學 webマーケティング担当',
    ],
    bio: '2009年に株式会社てっぺん入社。渋谷男道場店長、セミナー事業部責任者を経て、2016年より大嶋啓介マネージャーに就任。2022年に株式会社高橋コンサルティングを設立。現在は大嶋啓介氏のマネジメントを行いながら、人間力大學プロジェクトの企画立案、webのセールスプロモーションを担う。',
    highlights: [
      '2009年 株式会社てっぺん入社',
      '2011年 渋谷男道場 店長就任',
      '2013年 セミナー事業部 責任者就任',
      '2016年 大嶋啓介マネージャー就任',
      '2019年 個人事業主として独立',
      '2022年 株式会社高橋コンサルティング設立',
    ],
    links: [
      { label: 'Instagram', url: 'https://www.instagram.com/naohiro_takahashi222', icon: '📸' },
    ],
  },
  {
    id: 'mune',
    name: '漢那宗玄（むねさん）',
    emoji: '🧠',
    image: '/clay_mune.png',
    color: '#00b894',
    bg: '#d4f5e2',
    light: '#edfff5',
    description: '思考の学校 上級認定講師',
    sort_order: 3,
    titles: [
      '思考の学校 上級認定講師',
      '人間力大學 MC',
      '予祝プロジェクト責任者',
    ],
    bio: '潜在意識を味方につけると人生うまくいくをモットーに、予祝メソッド×潜在意識の見直しで、心のブレーキを外して、予祝で人生が突き抜ける方法を伝えています。自分の考えていることをうまく言葉にできない方、自分のネガティブを見直したいけど少し怖い方などのサポート、潜在意識の観点からのアプローチを得意としている。',
    highlights: [
      '売上6,000万円アップ',
      '臨時収入160万以上',
      '父親への見下しがなくなる → コンサル依頼が決まる',
      '母親との関係が劇的に改善',
      '無理せずお金が貯まるように',
      '本を出させていただくことに！',
      '部下にイライラしなくなり、尊敬されるように',
      '世界は私に優しいと心から思える出来事ばかり起きる',
      '受講生さまから臨時収入3500万円、2500万円、1200万円etc.',
    ],
    links: [
      { label: 'YouTube', url: 'https://www.youtube.com/@munekanna', icon: '▶️' },
      { label: '公式LINE', url: 'https://line.me/R/ti/p/@726ismkw', icon: '💬' },
    ],
  },
]

export function getVoterId(): string {
  const KEY = 'gacha_voter_id'
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(KEY, id)
  }
  return id
}

export function getNickname(): string {
  return localStorage.getItem('gacha_nickname') || ''
}

export function setNickname(name: string) {
  localStorage.setItem('gacha_nickname', name)
}

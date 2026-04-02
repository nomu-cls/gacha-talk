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

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { SPEAKERS } from '../types'
import type { GachaRound, Topic } from '../types'

interface Props {
  round: GachaRound
  compact?: boolean
}

export function ResultScreen({ round, compact }: Props) {
  const [winnerTopic, setWinnerTopic] = useState<Topic | null>(null)
  const [allTopics, setAllTopics] = useState<Topic[]>([])
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({})
  const [totalVotes, setTotalVotes] = useState(0)

  const speaker = SPEAKERS.find(s => s.id === round.speaker_id)

  useEffect(() => {
    if (round.winner_topic_id) {
      supabase.from('gacha_topics').select('*').eq('id', round.winner_topic_id).maybeSingle()
        .then(({ data }) => { if (data) setWinnerTopic(data as Topic) })
    }
    if (round.topic_ids?.length) {
      supabase.from('gacha_topics').select('*').in('id', round.topic_ids)
        .then(({ data }) => { if (data) setAllTopics(data as Topic[]) })
    }
    supabase.from('gacha_votes').select('topic_id').eq('round_id', round.id)
      .then(({ data }) => {
        if (data) {
          const counts: Record<string, number> = {}
          let total = 0
          for (const v of data) { counts[v.topic_id] = (counts[v.topic_id] || 0) + 1; total++ }
          setVoteCounts(counts)
          setTotalVotes(total)
        }
      })
  }, [round])

  if (compact) {
    return (
      <div className="p-4" style={{
        background: speaker?.light, borderRadius: '16px',
        border: `1px solid ${speaker?.color}15`,
      }}>
        <div className="flex items-center gap-2 mb-2">
          <img src={speaker?.image} className="w-6 h-6 rounded-full object-cover"
            style={{ border: `2px solid ${speaker?.color}30` }} />
          <span className="text-xs font-bold" style={{ color: speaker?.color }}>{speaker?.name.split('（')[0]}</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: '#fff0db', color: '#f7a44c' }}>🏆 {totalVotes}票</span>
        </div>
        {winnerTopic && <p className="text-sm font-bold pl-8" style={{ color: 'var(--text)' }}>{winnerTopic.text}</p>}
      </div>
    )
  }

  // Full ResultScreen
  const confettiColors = ['#ff6b9d', '#f7a44c', '#00b894', '#6c5ce7', '#ffd32a', '#e84393']

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6">

      {/* Confetti */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {confettiColors.map((color, i) =>
          Array.from({ length: 4 }, (_, j) => (
            <div key={`${i}-${j}`} className="absolute w-2 h-3 rounded-sm"
              style={{
                background: color,
                left: `${Math.random() * 100}%`,
                top: '-10px',
                animation: `confetti ${2 + Math.random() * 2}s linear ${Math.random() * 1.5}s forwards`,
                opacity: 0.8,
              }} />
          ))
        )}
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Trophy */}
        <div className="text-center mb-6 animate-pop-in">
          <div className="text-5xl mb-3">🏆</div>
          <h2 className="text-2xl font-black"
            style={{
              background: `linear-gradient(135deg, ${speaker?.color}, #f7a44c)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
            結果発表！
          </h2>
        </div>

        {/* Winner Card */}
        {winnerTopic && (
          <div className="p-6 mb-6 animate-slide-up" style={{
            background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)',
            borderRadius: 'var(--radius)',
            border: `3px solid ${speaker?.color}30`,
            boxShadow: `8px 8px 24px ${speaker?.color}15, 0 0 40px ${speaker?.color}08`,
          }}>
            <div className="flex items-center gap-2 mb-3">
              <img src={speaker?.image} className="w-10 h-10 rounded-full object-cover"
                style={{ border: `3px solid ${speaker?.color}30`, boxShadow: `0 2px 8px ${speaker?.color}15` }} />
              <div>
                <div className="text-sm font-bold" style={{ color: speaker?.color }}>{speaker?.name}</div>
                <div className="text-[10px] font-bold" style={{ color: 'var(--text3)' }}>
                  {voteCounts[winnerTopic.id] || 0}票 / {totalVotes}票
                </div>
              </div>
            </div>
            <p className="text-lg font-black leading-relaxed" style={{ color: 'var(--text)' }}>{winnerTopic.text}</p>
            <p className="text-xs mt-2 font-bold" style={{ color: 'var(--text3)' }}>by {winnerTopic.submitted_by}</p>
          </div>
        )}

        {/* Other topics */}
        <div className="space-y-3">
          {allTopics.filter(t => t.id !== round.winner_topic_id).map(topic => {
            const count = voteCounts[topic.id] || 0
            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
            return (
              <div key={topic.id} className="p-4 animate-fade-in" style={{
                background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(8px)',
                borderRadius: '16px', border: '1px solid rgba(255,255,255,0.5)',
              }}>
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>{topic.text}</p>
                <div className="flex justify-between text-xs font-bold" style={{ color: 'var(--text3)' }}>
                  <span>by {topic.submitted_by}</span>
                  <span>{count}票（{pct}%）</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="text-center mt-6 animate-fade-in">
          <p className="text-sm font-bold" style={{ color: speaker?.color, animation: 'pulse 2s infinite' }}>
            🎉 このテーマでトークします！
          </p>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { SPEAKERS, getVoterId } from '../types'
import type { GachaRound, Topic } from '../types'

interface Props {
  round: GachaRound
}

export function VotingPanel({ round }: Props) {
  const [topics, setTopics] = useState<Topic[]>([])
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({})
  const [myVote, setMyVote] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [totalVotes, setTotalVotes] = useState(0)
  const voterId = getVoterId()
  const speaker = SPEAKERS.find(s => s.id === round.speaker_id)

  useEffect(() => {
    if (!round.topic_ids?.length) return
    supabase.from('gacha_topics').select('*').in('id', round.topic_ids)
      .then(({ data }) => { if (data) setTopics(data as Topic[]) })
    supabase.from('gacha_votes').select('topic_id').eq('round_id', round.id).eq('voter_id', voterId).maybeSingle()
      .then(({ data }) => { if (data) setMyVote(data.topic_id) })
    fetchVoteCounts()
  }, [round.id, round.topic_ids])

  const fetchVoteCounts = useCallback(async () => {
    if (!round.topic_ids?.length) return
    const { data } = await supabase.from('gacha_votes').select('topic_id').eq('round_id', round.id)
    if (data) {
      const counts: Record<string, number> = {}
      let total = 0
      for (const v of data) { counts[v.topic_id] = (counts[v.topic_id] || 0) + 1; total++ }
      setVoteCounts(counts)
      setTotalVotes(total)
    }
  }, [round.id, round.topic_ids])

  useEffect(() => {
    const channel = supabase
      .channel(`votes_${round.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gacha_votes', filter: `round_id=eq.${round.id}` }, () => fetchVoteCounts())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [round.id, fetchVoteCounts])

  useEffect(() => {
    if (!round.voting_deadline) return
    const interval = setInterval(() => {
      const diff = new Date(round.voting_deadline!).getTime() - Date.now()
      setTimeLeft(diff <= 0 ? 0 : Math.ceil(diff / 1000))
      if (diff <= 0) clearInterval(interval)
    }, 100)
    return () => clearInterval(interval)
  }, [round.voting_deadline])

  async function handleVote(topicId: string) {
    if (myVote) return
    setMyVote(topicId)
    await supabase.from('gacha_votes').insert({ round_id: round.id, topic_id: topicId, voter_id: voterId })
    fetchVoteCounts()
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <div className="min-h-dvh flex flex-col p-4">
      {/* Header */}
      <div className="text-center pt-4 pb-6 animate-fade-in">
        <div className="flex items-center justify-center gap-2 mb-2">
          <img src={speaker?.image} className="w-10 h-10 rounded-full object-cover"
            style={{ border: `3px solid ${speaker?.color}30`, boxShadow: `0 2px 8px ${speaker?.color}15` }} />
          <span className="text-sm font-bold" style={{ color: speaker?.color }}>{speaker?.name}</span>
        </div>
        <h2 className="text-xl font-black mb-3" style={{ color: 'var(--text)' }}>🗳️ 投票しよう！</h2>

        {timeLeft !== null && (
          <div className={`inline-flex items-center gap-2 px-5 py-2 font-black text-lg ${
            timeLeft <= 10 ? 'animate-pulse-count' : ''
          }`} style={{
            background: timeLeft <= 10 ? '#ffe8f0' : 'rgba(255,255,255,0.85)',
            color: timeLeft <= 10 ? '#e84393' : 'var(--text)',
            borderRadius: '16px', backdropFilter: 'blur(8px)',
            boxShadow: '4px 4px 12px rgba(0,0,0,0.04)',
            border: `2px solid ${timeLeft <= 10 ? 'rgba(232,67,147,0.2)' : 'rgba(255,255,255,0.5)'}`,
          }}>
            <span>⏱️</span>
            <span>{timeLeft <= 0 ? '投票終了！' : formatTime(timeLeft)}</span>
          </div>
        )}

        <div className="text-xs font-bold mt-3" style={{ color: 'var(--text3)' }}>{totalVotes}人が投票済み</div>
      </div>

      {/* Topic Cards */}
      <div className="flex-1 max-w-md mx-auto w-full space-y-4">
        {topics.map((topic, i) => {
          const count = voteCounts[topic.id] || 0
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
          const isMyVote = myVote === topic.id

          return (
            <button key={topic.id} onClick={() => handleVote(topic.id)}
              disabled={!!myVote || timeLeft === 0}
              className="w-full text-left p-5 transition-all"
              style={{
                background: isMyVote ? speaker?.bg : 'rgba(255,255,255,0.85)',
                borderRadius: 'var(--radius)',
                backdropFilter: 'blur(12px)',
                boxShadow: isMyVote
                  ? `6px 6px 16px ${speaker?.color}15, 0 0 0 3px ${speaker?.color}30`
                  : '4px 4px 12px rgba(0,0,0,0.04)',
                border: `2px solid ${isMyVote ? speaker?.color + '30' : 'rgba(255,255,255,0.5)'}`,
                opacity: myVote && !isMyVote ? 0.6 : 1,
                transform: isMyVote ? 'scale(1.02)' : 'scale(1)',
              }}>
              <div className="flex items-start gap-3 mb-2">
                <span className="text-2xl font-black" style={{ color: speaker?.color, opacity: 0.3 }}>{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-bold leading-relaxed" style={{ color: 'var(--text)' }}>{topic.text}</p>
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text3)' }}>by {topic.submitted_by}</p>
                </div>
                {isMyVote && <span className="text-xl animate-pop-in">✅</span>}
              </div>
              {myVote && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs font-bold mb-1" style={{ color: 'var(--text2)' }}>
                    <span>{count}票</span><span>{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.04)' }}>
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: `linear-gradient(135deg, ${speaker?.color}, ${speaker?.color}88)` }} />
                  </div>
                </div>
              )}
            </button>
          )
        })}
      </div>

      <div className="text-center py-4">
        {!myVote && timeLeft !== 0 && (
          <p className="text-sm font-bold" style={{ color: speaker?.color, animation: 'pulse 1.5s infinite' }}>
            👆 タップして投票してください
          </p>
        )}
        {myVote && timeLeft !== 0 && (
          <p className="text-sm font-bold" style={{ color: '#00b894' }}>
            ✅ 投票しました！結果をお待ちください 🎉
          </p>
        )}
      </div>
    </div>
  )
}

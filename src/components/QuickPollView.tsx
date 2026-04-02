import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getVoterId, SPEAKERS } from '../types'

interface QuickPoll {
  id: string
  question: string
  options: string[]
  status: 'active' | 'closed' | 'draft'
  speaker_id: string
  created_at: string
}

interface Props {
  poll: QuickPoll
}

export function QuickPollView({ poll }: Props) {
  const speaker = SPEAKERS.find(s => s.id === poll.speaker_id) || SPEAKERS[0]

  const [votes, setVotes] = useState<Record<number, number>>({})
  const [myVote, setMyVote] = useState<number | null>(null)
  const [totalVotes, setTotalVotes] = useState(0)
  const voterId = getVoterId()

  const fetchVotes = useCallback(async () => {
    const { data } = await supabase
      .from('quick_poll_votes')
      .select('option_index')
      .eq('poll_id', poll.id)

    if (data) {
      const counts: Record<number, number> = {}
      data.forEach(v => { counts[v.option_index] = (counts[v.option_index] || 0) + 1 })
      setVotes(counts)
      setTotalVotes(data.length)
    }

    // Check if already voted
    const { data: myData } = await supabase
      .from('quick_poll_votes')
      .select('option_index')
      .eq('poll_id', poll.id)
      .eq('voter_id', voterId)
      .maybeSingle()

    if (myData) setMyVote(myData.option_index)
  }, [poll.id, voterId])

  useEffect(() => {
    fetchVotes()
    const ch = supabase.channel(`poll_votes_${poll.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quick_poll_votes' }, fetchVotes)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchVotes, poll.id])

  async function vote(index: number) {
    if (myVote !== null) return
    await supabase.from('quick_poll_votes').insert({
      poll_id: poll.id, option_index: index, voter_id: voterId,
    })
    setMyVote(index)
    fetchVotes()
  }

  const hasVoted = myVote !== null
  const maxVotes = Math.max(...Object.values(votes), 1)

  return (
    <div className="min-h-dvh flex items-center justify-center p-6">
      <div className="w-full max-w-sm animate-fade-in">

        {/* Header (Speaker Illustration) */}
        <div className="text-center mb-6 animate-bounce" style={{ animationDuration: '2s' }}>
          <div className="relative inline-block">
            <div className="w-20 h-20 mx-auto mb-2 rounded-[2rem] flex items-center justify-center overflow-hidden"
              style={{
                background: speaker.light,
                border: `3px solid ${speaker.color}40`,
                boxShadow: `0 8px 24px ${speaker.color}30`,
              }}>
              <img src={speaker.image} alt={speaker.name} className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-2 -right-3 text-2xl drop-shadow-md">🎤</div>
          </div>
          <h2 className="text-sm font-black mt-2" style={{ color: speaker.color }}>
            {speaker.name.split('（')[0].split('スタイル')[0]} からの質問！
          </h2>
        </div>

        {/* Question Card */}
        <div className="p-5 mb-5" style={{
          background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(16px)',
          borderRadius: 'var(--radius)',
          border: '1px solid rgba(255,255,255,0.7)',
          boxShadow: '6px 6px 20px rgba(0,0,0,0.04)',
        }}>
          <p className="text-base font-black text-center leading-relaxed" style={{ color: 'var(--text)' }}>
            {poll.question}
          </p>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {poll.options.map((option, i) => {
            const count = votes[i] || 0
            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
            const isMyChoice = myVote === i
            const isWinner = hasVoted && count === maxVotes && count > 0

            return (
              <button key={i}
                onClick={() => vote(i)}
                disabled={hasVoted}
                className="w-full text-left p-4 transition-all relative overflow-hidden"
                style={{
                  borderRadius: '16px', border: 'none',
                  background: isMyChoice
                    ? 'linear-gradient(135deg, rgba(108,92,231,0.12), rgba(168,85,247,0.08))'
                    : 'rgba(255,255,255,0.8)',
                  boxShadow: isMyChoice
                    ? 'inset 2px 2px 6px rgba(108,92,231,0.1)'
                    : '4px 4px 12px rgba(0,0,0,0.04), -2px -2px 6px rgba(255,255,255,0.8)',
                  outline: isMyChoice ? '2px solid rgba(108,92,231,0.3)' : 'none',
                }}>
                {/* Progress bar background */}
                {hasVoted && (
                  <div className="absolute inset-0 transition-all duration-700 ease-out"
                    style={{
                      background: isMyChoice
                        ? 'linear-gradient(90deg, rgba(168,85,247,0.3), rgba(236,72,153,0.1))'
                        : 'linear-gradient(90deg, rgba(0,0,0,0.06), rgba(0,0,0,0.02))',
                      width: `${pct}%`,
                      borderRadius: '16px',
                    }} />
                )}
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
                      style={{
                        background: isMyChoice ? '#6c5ce7' : 'rgba(0,0,0,0.06)',
                        color: isMyChoice ? 'white' : 'var(--text2)',
                      }}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>
                      {option}
                    </span>
                  </div>
                  {hasVoted && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black" style={{ color: isWinner ? '#6c5ce7' : 'var(--text3)' }}>
                        {pct}%
                      </span>
                      <span className="text-[10px] font-bold" style={{ color: 'var(--text3)' }}>
                        ({count})
                      </span>
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Status */}
        <div className="text-center mt-5">
          {hasVoted ? (
            <p className="text-xs font-bold" style={{ color: 'var(--text3)' }}>
              ✅ 投票しました！（計 {totalVotes} 票）
            </p>
          ) : (
            <p className="text-xs font-bold animate-pulse" style={{ color: '#6c5ce7' }}>
              タップして投票してください 🗳️
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

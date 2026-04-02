import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { SPEAKERS } from '../types'
import type { GachaRound, Topic } from '../types'

interface Props {
  round: GachaRound
}

export function GachaAnimation({ round }: Props) {
  const [phase, setPhase] = useState<'spinning' | 'reveal'>('spinning')
  const [revealedTopics, setRevealedTopics] = useState<Topic[]>([])
  const [revealIndex, setRevealIndex] = useState(0)

  const speaker = SPEAKERS.find(s => s.id === round.speaker_id)

  useEffect(() => {
    if (round.topic_ids?.length) {
      supabase
        .from('gacha_topics')
        .select('*')
        .in('id', round.topic_ids)
        .then(({ data }) => { if (data) setRevealedTopics(data as Topic[]) })
    }
    const spinTimer = setTimeout(() => setPhase('reveal'), 3000)
    return () => clearTimeout(spinTimer)
  }, [round.topic_ids])

  useEffect(() => {
    if (phase !== 'reveal' || revealedTopics.length === 0) return
    if (revealIndex >= revealedTopics.length) return
    const timer = setTimeout(() => setRevealIndex(prev => prev + 1), 1000)
    return () => clearTimeout(timer)
  }, [phase, revealIndex, revealedTopics.length])

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6">

      {/* Speaker */}
      <div className="mb-6 text-center animate-fade-in">
        <img src={speaker?.image} className="w-16 h-16 rounded-full object-cover mx-auto mb-2"
          style={{ border: `4px solid ${speaker?.color}40`, boxShadow: `0 4px 16px ${speaker?.color}20` }} />
        <div className="text-sm font-bold" style={{ color: speaker?.color }}>{speaker?.name}</div>
      </div>

      {phase === 'spinning' ? (
        <div className="text-center">
          <div className="relative w-36 h-36 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full"
              style={{ border: `3px dashed ${speaker?.color}30`, animation: 'gachaSpin 1.5s linear infinite' }} />
            <div className="absolute inset-4 rounded-full flex items-center justify-center overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(12px)',
                boxShadow: '6px 6px 16px rgba(0,0,0,0.05)',
                border: '3px solid rgba(255,255,255,0.8)',
                animation: 'gachaBounce 0.4s ease-in-out infinite alternate',
              }}>
              <img src="/gacha_machine.png" className="w-14 h-14 object-contain rounded-2xl" style={{ mixBlendMode: 'multiply' }} />
            </div>
          </div>
          <p className="text-lg font-black" style={{ color: speaker?.color, animation: 'pulse 0.8s ease-in-out infinite' }}>
            ガチャ回転中... 🎰
          </p>
          <p className="text-sm font-bold mt-2" style={{ color: 'var(--text2)' }}>お題が出てきます！</p>
        </div>
      ) : (
        <div className="w-full max-w-md space-y-4">
          <h2 className="text-center text-xl font-black mb-6 animate-pop-in" style={{ color: 'var(--text)' }}>
            ✨ 今回のお題はこの3つ！
          </h2>
          {revealedTopics.map((topic, i) => {
            const topicSpeaker = SPEAKERS.find(s => s.id === topic.speaker_id)
            return (
              <div key={topic.id}
                className={`transition-all duration-500 ${i < revealIndex ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                <div className="p-5" style={{
                  background: topicSpeaker?.light || 'rgba(255,255,255,0.85)',
                  borderRadius: 'var(--radius)',
                  border: `2px solid ${topicSpeaker?.color}20`,
                  boxShadow: `6px 6px 16px ${topicSpeaker?.color}10, -3px -3px 8px rgba(255,255,255,0.8)`,
                }}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl font-black" style={{ color: topicSpeaker?.color, opacity: 0.3 }}>{i + 1}</span>
                    <div className="flex-1">
                      <p className="font-bold text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{topic.text}</p>
                      <p className="text-[10px] mt-2 font-bold" style={{ color: 'var(--text3)' }}>by {topic.submitted_by}</p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          {revealIndex >= revealedTopics.length && (
            <div className="text-center pt-4 animate-fade-in">
              <p className="text-sm font-bold" style={{ color: speaker?.color, animation: 'pulse 1.5s ease-in-out infinite' }}>
                ⏳ まもなく投票が始まります...
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

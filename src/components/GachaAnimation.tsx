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
          {/* Capsule spinning animation — ported from BuzzScope */}
          <div className="relative mx-auto mb-8" style={{ width: 160, height: 160 }}>
            {/* Outer glow pulse */}
            <div className="absolute inset-0 rounded-full"
              style={{
                background: `radial-gradient(circle, ${speaker?.color}15 0%, transparent 70%)`,
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            {/* Spinning dashed ring */}
            <div className="absolute rounded-full"
              style={{
                inset: 10,
                border: `6px dashed ${speaker?.color}40`,
                borderRadius: '50%',
                animation: 'gachaRingSpin 1s linear infinite',
              }} />
            {/* Second ring — counter rotation */}
            <div className="absolute rounded-full"
              style={{
                inset: 24,
                border: `3px dashed ${speaker?.color}20`,
                borderRadius: '50%',
                animation: 'gachaRingSpin 1.8s linear infinite reverse',
              }} />
            {/* Capsule ball — half color / half white */}
            <div className="absolute rounded-full"
              style={{
                inset: 36,
                background: `linear-gradient(135deg, ${speaker?.color} 0%, ${speaker?.color} 50%, #fff 50%, #fff 100%)`,
                borderRadius: '50%',
                boxShadow: `0 8px 32px ${speaker?.color}40, inset 0 -4px 12px rgba(0,0,0,0.1), inset 0 4px 8px rgba(255,255,255,0.6)`,
                animation: 'gachaBounce 0.3s ease-in-out infinite alternate',
              }}>
              {/* Capsule divider line */}
              <div style={{
                position: 'absolute', left: '50%', top: '10%', bottom: '10%',
                width: 2, background: 'rgba(0,0,0,0.08)', transform: 'translateX(-50%) rotate(45deg)',
              }} />
              {/* Capsule highlight */}
              <div style={{
                position: 'absolute', top: '15%', left: '20%',
                width: '25%', height: '20%', borderRadius: '50%',
                background: 'rgba(255,255,255,0.5)',
                filter: 'blur(4px)',
              }} />
            </div>
          </div>
          {/* Pulsing text */}
          <p className="text-xl font-black mb-2" style={{ color: speaker?.color, animation: 'gachaPulse 0.5s ease-in-out infinite alternate' }}>
            ガチャ回転中... 🎰
          </p>
          <p className="text-sm font-bold" style={{ color: 'var(--text2)' }}>お題が出てきます！</p>
          {/* Floating particles */}
          <div className="relative mx-auto mt-4" style={{ width: 200, height: 20 }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{
                position: 'absolute',
                left: `${15 + i * 18}%`,
                width: 6, height: 6, borderRadius: '50%',
                background: speaker?.color,
                opacity: 0.3,
                animation: `float ${1.5 + i * 0.3}s ease-in-out infinite`,
                animationDelay: `${i * 0.2}s`,
              }} />
            ))}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-md space-y-4">
          <h2 className="text-center text-xl font-black mb-6 animate-pop-in" style={{ color: 'var(--text)' }}>
            ✨ 今回のお題はこの{revealedTopics.length}つ！
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

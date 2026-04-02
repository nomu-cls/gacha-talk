import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { SPEAKERS } from '../types'
import type { Topic } from '../types'

interface Props {
  nickname: string
}

export function TopicSubmit({ nickname }: Props) {
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [topics, setTopics] = useState<Topic[]>([])
  const [justSubmitted, setJustSubmitted] = useState(false)

  useEffect(() => {
    fetchTopics()
    const channel = supabase
      .channel('topics_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gacha_topics' }, () => fetchTopics())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function fetchTopics() {
    const { data } = await supabase
      .from('gacha_topics')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setTopics(data as Topic[])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSpeaker || !text.trim()) return
    setSubmitting(true)
    await supabase.from('gacha_topics').insert({
      speaker_id: selectedSpeaker,
      text: text.trim(),
      submitted_by: nickname,
    })
    setText('')
    setSubmitting(false)
    setJustSubmitted(true)
    setTimeout(() => setJustSubmitted(false), 2000)
    fetchTopics()
  }

  async function deleteMyTopic(id: string) {
    await supabase.from('gacha_topics').delete().eq('id', id)
    fetchTopics()
  }

  const speakerTopicCount = (speakerId: string) => topics.filter(t => t.speaker_id === speakerId).length
  const currentSpeaker = SPEAKERS.find(s => s.id === selectedSpeaker)

  return (
    <div className="min-h-dvh flex flex-col pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 px-4 py-3"
        style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.3)' }}>
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <img src="/gacha_machine.png" className="w-7 h-7 object-contain" />
            <span className="font-black text-sm"
              style={{
                background: 'linear-gradient(135deg, #e84393, #f39c12)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>ガチャトーク</span>
          </div>
          <div className="text-xs font-bold px-3 py-1.5"
            style={{ background: 'rgba(255,255,255,0.7)', borderRadius: '12px', color: 'var(--text2)' }}>
            {nickname}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6 w-full">
        {/* Instruction */}
        <div className="text-center animate-fade-in">
          <h2 className="text-xl font-black mb-2" style={{ color: 'var(--text)' }}>
            🎤 聞きたいことを投稿しよう！
          </h2>
          <p className="text-sm font-medium" style={{ color: 'var(--text2)' }}>
            登壇者を選んで、話してほしいテーマや質問を投稿 ✨<br />
            ガチャで選ばれたお題にみんなで投票します！
          </p>
        </div>

        {/* Speaker Selection */}
        <div className="grid grid-cols-3 gap-3">
          {SPEAKERS.map(s => {
            const count = speakerTopicCount(s.id)
            const active = selectedSpeaker === s.id
            return (
              <button
                key={s.id}
                onClick={() => setSelectedSpeaker(active ? null : s.id)}
                className="relative p-3 text-center transition-all"
                style={{
                  background: active ? s.bg : 'rgba(255,255,255,0.7)',
                  borderRadius: 'var(--radius)',
                  border: `2px solid ${active ? s.color + '40' : 'rgba(255,255,255,0.5)'}`,
                  boxShadow: active
                    ? `inset 2px 2px 6px ${s.color}15, 0 0 0 2px ${s.color}20`
                    : '4px 4px 12px rgba(0,0,0,0.04), -2px -2px 6px rgba(255,255,255,0.8)',
                  transform: active ? 'scale(0.97)' : 'scale(1)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <img src={s.image} alt={s.name}
                  className="w-12 h-12 rounded-full object-cover mx-auto mb-2"
                  style={{ border: `3px solid ${s.color}30`, boxShadow: `0 2px 8px ${s.color}15` }} />
                <div className="text-xs font-bold leading-tight" style={{ color: active ? s.color : 'var(--text)' }}>
                  {s.name.split('（')[0].split('スタイル')[0]}
                </div>
                {count > 0 && (
                  <div className="absolute -top-2 -right-2 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: s.color, boxShadow: `2px 2px 4px ${s.color}40` }}>
                    {count}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Submit Form */}
        {currentSpeaker && (
          <form onSubmit={handleSubmit} className="animate-slide-up space-y-3">
            <div className="p-5"
              style={{
                background: currentSpeaker.light, borderRadius: 'var(--radius)',
                border: `2px solid ${currentSpeaker.color}15`,
                boxShadow: `4px 4px 12px ${currentSpeaker.color}08`,
              }}>
              <div className="flex items-center gap-2 mb-3">
                <img src={currentSpeaker.image}
                  className="w-8 h-8 rounded-full object-cover"
                  style={{ border: `2px solid ${currentSpeaker.color}30` }} />
                <span className="text-sm font-bold" style={{ color: currentSpeaker.color }}>
                  {currentSpeaker.name} に聞きたいこと
                </span>
              </div>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="例：3人が出会ったきっかけと、友達になった瞬間のエピソード"
                rows={3}
                autoFocus
                className="w-full px-4 py-3 text-sm font-medium outline-none resize-none"
                style={{
                  background: 'rgba(255,255,255,0.7)', borderRadius: '16px',
                  border: `1px solid ${currentSpeaker.color}15`, color: 'var(--text)',
                }}
              />
              <button
                type="submit"
                disabled={!text.trim() || submitting}
                className="w-full mt-3 py-3 font-bold text-sm text-white disabled:opacity-30"
                style={{
                  background: `linear-gradient(135deg, ${currentSpeaker.color}, ${currentSpeaker.color}cc)`,
                  borderRadius: '16px', border: 'none',
                  boxShadow: `4px 4px 12px ${currentSpeaker.color}30`,
                }}
              >
                {submitting ? '送信中...' : justSubmitted ? '✅ 送信しました！' : '📤 お題を投稿する'}
              </button>
            </div>
          </form>
        )}

        {/* All Topics - grouped by speaker */}
        {SPEAKERS.map(speaker => {
          const sTopics = topics.filter(t => t.speaker_id === speaker.id)
          if (sTopics.length === 0) return null
          return (
            <div key={speaker.id} className="animate-fade-in">
              <div className="flex items-center gap-2 mb-3">
                <img src={speaker.image} alt={speaker.name}
                  className="w-7 h-7 rounded-full object-cover"
                  style={{ border: `2px solid ${speaker.color}30` }} />
                <span className="text-sm font-bold" style={{ color: speaker.color }}>
                  {speaker.name.split('（')[0]}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: speaker.bg, color: speaker.color }}>
                  {sTopics.length}件
                </span>
              </div>
              <div className="space-y-2">
                {sTopics.map(topic => {
                  const isMine = topic.submitted_by === nickname
                  return (
                    <div key={topic.id}
                      className="flex items-start gap-3 px-4 py-3 group"
                      style={{
                        background: speaker.light, borderRadius: '16px',
                        border: `1px solid ${speaker.color}10`,
                        boxShadow: `3px 3px 8px ${speaker.color}06`,
                      }}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{topic.text}</p>
                        <p className="text-[10px] mt-1 font-bold" style={{ color: 'var(--text3)' }}>
                          by {topic.submitted_by}
                        </p>
                      </div>
                      {isMine && (
                        <button onClick={() => deleteMyTopic(topic.id)}
                          className="text-[10px] font-bold shrink-0 px-2 py-1 rounded-lg opacity-50 hover:opacity-100 transition-opacity"
                          style={{ color: '#e84393', background: 'rgba(232,67,147,0.08)' }}>
                          削除
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {topics.length === 0 && (
          <div className="text-center py-12" style={{ color: 'var(--text3)' }}>
            <img src="/gacha_machine.png" className="w-16 h-16 mx-auto mb-3 opacity-30 object-contain" />
            <p className="text-sm font-bold">まだお題がありません</p>
            <p className="text-xs mt-1">上の登壇者を選んでお題を投稿してみましょう！ 🎉</p>
          </div>
        )}
      </div>
    </div>
  )
}

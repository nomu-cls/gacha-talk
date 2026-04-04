import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { SPEAKERS } from '../types'
import type { Topic, Speaker } from '../types'

interface Props {
  nickname: string
}

export function TopicSubmit({ nickname }: Props) {
  const [selectedSpeaker, setSelectedSpeaker] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [topics, setTopics] = useState<Topic[]>([])
  const [justSubmitted, setJustSubmitted] = useState(false)
  const [profileSpeaker, setProfileSpeaker] = useState<Speaker | null>(null)

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
            <div className="w-8 h-8 bg-white/90 rounded-xl flex items-center justify-center shadow-sm border border-white/50 overflow-hidden">
              <img src="/gacha_machine.png" className="w-6 h-6 object-contain rounded-md" style={{ mixBlendMode: 'multiply' }} />
            </div>
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
            登壇者に聞きたいテーマ（お題）を書いてね ✨<br />
            ガチャで選ばれたお題にみんなで投票します！
          </p>
          {!selectedSpeaker && (
            <div className="mt-4 animate-float" style={{ color: 'var(--accent)' }}>
              <p className="text-sm font-black">👇 まずは、登壇者を選択してね</p>
            </div>
          )}
        </div>

        {/* Speaker Selection */}
        <div className="grid grid-cols-3 gap-3">
          {SPEAKERS.map(s => {
            const count = speakerTopicCount(s.id)
            const active = selectedSpeaker === s.id
            return (
              <div
                key={s.id}
                className="relative p-3 text-center transition-all cursor-pointer"
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
                onClick={() => setSelectedSpeaker(active ? null : s.id)}
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
                <button
                  onClick={(e) => { e.stopPropagation(); setProfileSpeaker(s); }}
                  className="mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-lg transition-all active:scale-95"
                  style={{ background: `${s.color}15`, color: s.color }}
                >
                  プロフィール
                </button>
              </div>
            )
          })}
        </div>

        {/* Sample Topics — show when no speaker selected */}
        {!selectedSpeaker && (
          <div className="animate-fade-in p-4" style={{
            background: 'rgba(255,255,255,0.7)', borderRadius: 'var(--radius)',
            backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.5)',
            boxShadow: '4px 4px 12px rgba(0,0,0,0.03)',
          }}>
            <p className="text-xs font-black text-center mb-3" style={{ color: 'var(--text2)' }}>
              💡 こんなお題を投稿できるよ！
            </p>
            <div className="space-y-2.5">
              {[
                { speaker: SPEAKERS[1], text: 'どうしてマッチをスカウトしたの？' },
                { speaker: SPEAKERS[0], text: '一番テンション上がった案件って何？' },
                { speaker: SPEAKERS[2], text: '思考の学校に入ったきっかけは？' },
              ].map((sample, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedSpeaker(sample.speaker.id)
                    setText(sample.text)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all hover:scale-[0.98] active:scale-95"
                  style={{
                    background: sample.speaker.light, borderRadius: '16px',
                    border: `1px solid ${sample.speaker.color}15`,
                  }}>
                  <img src={sample.speaker.image}
                    className="w-8 h-8 rounded-full object-cover shrink-0"
                    style={{ border: `2px solid ${sample.speaker.color}30` }} />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold block" style={{ color: sample.speaker.color }}>
                      {sample.speaker.name.split('（')[0].split('スタイル')[0]} に質問
                    </span>
                    <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>
                      「{sample.text}」
                    </span>
                  </div>
                  <span className="text-[10px] font-bold shrink-0 px-2 py-1 rounded-lg"
                    style={{ background: `${sample.speaker.color}10`, color: sample.speaker.color }}>
                    例
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-center mt-3 font-bold" style={{ color: 'var(--text3)' }}>
              ↑ タップするとそのまま投稿できます
            </p>
          </div>
        )}

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
                placeholder={currentSpeaker.id === 'match' ? '例：一番テンション上がった案件って何？' : currentSpeaker.id === 'nao' ? '例：どうしてマッチをスカウトしたの？' : '例：思考の学校で一番衝撃だった学びは？'}
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

        {/* Topic Count Summary */}
        <div className="p-4 text-center" style={{
          background: 'rgba(255,255,255,0.75)', borderRadius: 'var(--radius)',
          backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.5)',
          boxShadow: '4px 4px 12px rgba(0,0,0,0.03)',
        }}>
          <p className="text-xs font-bold mb-3" style={{ color: 'var(--text2)' }}>
            🎰 みんなからのお題（ガチャで抽選！）
          </p>
          <div className="flex justify-center gap-4">
            {SPEAKERS.map(s => (
              <div key={s.id} className="flex items-center gap-1.5">
                <img src={s.image} className="w-6 h-6 rounded-full object-cover"
                  style={{ border: `2px solid ${s.color}30` }} />
                <span className="text-lg font-black" style={{ color: s.color }}>
                  {speakerTopicCount(s.id)}
                </span>
                <span className="text-[10px] font-bold" style={{ color: 'var(--text3)' }}>件</span>
              </div>
            ))}
          </div>
        </div>

        {/* My Topics Only */}
        {topics.filter(t => t.submitted_by === nickname).length > 0 && (
          <div className="animate-fade-in">
            <h3 className="text-sm font-black mb-3 flex items-center gap-1" style={{ color: 'var(--text)' }}>
              ✏️ あなたの投稿
            </h3>
            <div className="space-y-2">
              {topics.filter(t => t.submitted_by === nickname).map(topic => {
                const speaker = SPEAKERS.find(s => s.id === topic.speaker_id)
                return (
                  <div key={topic.id}
                    className="flex items-start gap-3 px-4 py-3"
                    style={{
                      background: speaker?.light || 'rgba(255,255,255,0.7)',
                      borderRadius: '16px',
                      border: `1px solid ${speaker?.color || '#ddd'}10`,
                    }}>
                    <img src={speaker?.image} className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5"
                      style={{ border: `2px solid ${speaker?.color}30` }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{topic.text}</p>
                    </div>
                    <button onClick={() => deleteMyTopic(topic.id)}
                      className="text-xs font-bold shrink-0 px-3 py-1.5 rounded-lg transition-opacity active:scale-95"
                      style={{ color: '#e84393', background: 'rgba(232,67,147,0.1)' }}>
                      削除
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {topics.length === 0 && (
          <div className="text-center py-12" style={{ color: 'var(--text3)' }}>
            <div className="mx-auto w-20 h-20 bg-white/50 rounded-3xl flex items-center justify-center mb-3 overflow-hidden">
              <img src="/gacha_machine.png" className="w-14 h-14 opacity-40 object-contain rounded-2xl" style={{ mixBlendMode: 'multiply' }} />
            </div>
            <p className="text-sm font-bold">まだお題がありません</p>
            <p className="text-xs mt-1">上の登壇者を選んでお題を投稿してみましょう！ 🎉</p>
          </div>
        )}
      </div>

      {/* Profile Modal */}
      {profileSpeaker && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
          style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setProfileSpeaker(null) }}
        >
          <div
            className="w-full sm:max-w-md max-h-[85dvh] overflow-y-auto animate-slide-up"
            style={{
              background: 'rgba(255,255,255,0.97)',
              backdropFilter: 'blur(20px)',
              borderRadius: '28px 28px 0 0',
              borderTopLeftRadius: '28px',
              borderTopRightRadius: '28px',
              border: '1px solid rgba(255,255,255,0.6)',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.12)',
            }}
          >
            {/* Header */}
            <div className="relative px-6 pt-6 pb-4" style={{ background: profileSpeaker.light }}>
              <button
                onClick={() => setProfileSpeaker(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: 'rgba(0,0,0,0.06)' }}
              >
                ✕
              </button>
              <div className="flex items-center gap-4">
                <img
                  src={profileSpeaker.image}
                  alt={profileSpeaker.name}
                  className="w-20 h-20 rounded-2xl object-cover"
                  style={{
                    border: `3px solid ${profileSpeaker.color}40`,
                    boxShadow: `0 4px 16px ${profileSpeaker.color}20`,
                  }}
                />
                <div>
                  <h3 className="text-lg font-black leading-snug" style={{ color: 'var(--text)' }}>
                    {profileSpeaker.name}
                  </h3>
                  <p className="text-xs font-bold mt-1" style={{ color: profileSpeaker.color }}>
                    {profileSpeaker.description}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 space-y-5">
              {/* Titles */}
              {profileSpeaker.titles.length > 0 && (
                <div>
                  <p className="text-[10px] font-black mb-2 tracking-wider" style={{ color: 'var(--text3)' }}>肩書き</p>
                  <div className="flex flex-wrap gap-1.5">
                    {profileSpeaker.titles.map((t, i) => (
                      <span
                        key={i}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-lg"
                        style={{
                          background: `${profileSpeaker.color}10`,
                          color: profileSpeaker.color,
                          border: `1px solid ${profileSpeaker.color}15`,
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Bio */}
              <div>
                <p className="text-[10px] font-black mb-2 tracking-wider" style={{ color: 'var(--text3)' }}>プロフィール</p>
                <p className="text-sm leading-relaxed font-medium" style={{ color: 'var(--text)' }}>
                  {profileSpeaker.bio}
                </p>
              </div>

              {/* Highlights */}
              {profileSpeaker.highlights.length > 0 && (
                <div>
                  <p className="text-[10px] font-black mb-2 tracking-wider" style={{ color: 'var(--text3)' }}>
                    {profileSpeaker.id === 'nao' ? '経歴' : '✨ Before → After'}
                  </p>
                  <div className="space-y-1.5">
                    {profileSpeaker.highlights.map((h, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-xs font-medium py-1.5 px-3 rounded-lg"
                        style={{ background: `${profileSpeaker.color}08`, color: 'var(--text)' }}
                      >
                        <span className="shrink-0 mt-0.5" style={{ color: profileSpeaker.color }}>
                          {profileSpeaker.id === 'nao' ? '📌' : '✅'}
                        </span>
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Links */}
              {profileSpeaker.links.length > 0 && (
                <div>
                  <p className="text-[10px] font-black mb-2 tracking-wider" style={{ color: 'var(--text3)' }}>SNS・リンク</p>
                  <div className="flex flex-wrap gap-2">
                    {profileSpeaker.links.map((link, i) => (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all active:scale-95"
                        style={{
                          background: `${profileSpeaker.color}12`,
                          color: profileSpeaker.color,
                          border: `1px solid ${profileSpeaker.color}20`,
                        }}
                      >
                        <span>{link.icon}</span>
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA */}
              <button
                onClick={() => {
                  setSelectedSpeaker(profileSpeaker.id)
                  setProfileSpeaker(null)
                }}
                className="w-full py-3.5 font-bold text-sm text-white active:scale-[0.97] transition-transform"
                style={{
                  background: `linear-gradient(135deg, ${profileSpeaker.color}, ${profileSpeaker.color}cc)`,
                  borderRadius: '16px',
                  border: 'none',
                  boxShadow: `4px 4px 14px ${profileSpeaker.color}30`,
                }}
              >
                🎤 この人に質問する！
              </button>
            </div>

            {/* Safe area padding for mobile */}
            <div className="h-6" />
          </div>
        </div>
      )}
    </div>
  )
}

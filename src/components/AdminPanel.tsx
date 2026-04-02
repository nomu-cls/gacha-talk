import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { SPEAKERS } from '../types'
import type { GachaRound, Topic } from '../types'
import { ResultScreen } from './ResultScreen'

interface Props {
  activeRound: GachaRound | null
  onRoundChange: () => void
}

export function AdminPanel({ activeRound, onRoundChange }: Props) {
  const [topics, setTopics] = useState<Topic[]>([])
  const [rounds, setRounds] = useState<GachaRound[]>([])
  const [selectedSpeaker, setSelectedSpeaker] = useState(SPEAKERS[0].id)
  const [votingMinutes, setVotingMinutes] = useState(3)
  const [loading, setLoading] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [gachaCount, setGachaCount] = useState(3)

  const fetchTopics = useCallback(async () => {
    const { data } = await supabase.from('gacha_topics').select('*').order('created_at', { ascending: false })
    if (data) setTopics(data as Topic[])
  }, [])

  const fetchRounds = useCallback(async () => {
    const { data } = await supabase.from('gacha_rounds').select('*').order('created_at', { ascending: false }).limit(20)
    if (data) setRounds(data as GachaRound[])
  }, [])

  useEffect(() => {
    fetchTopics()
    fetchRounds()
    const ch1 = supabase.channel('admin_topics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gacha_topics' }, fetchTopics).subscribe()
    const ch2 = supabase.channel('admin_rounds')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gacha_rounds' }, () => { fetchRounds(); onRoundChange() }).subscribe()
    const ch3 = supabase.channel('admin_votes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gacha_votes' }, fetchRounds).subscribe()
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); supabase.removeChannel(ch3) }
  }, [fetchTopics, fetchRounds, onRoundChange])

  async function deleteTopic(id: string) {
    await supabase.from('gacha_topics').delete().eq('id', id)
    fetchTopics()
  }

  async function startGacha() {
    setLoading(true)
    const speakerTopics = topics.filter(t => t.speaker_id === selectedSpeaker)
    if (speakerTopics.length < gachaCount) {
      alert(`お題が${gachaCount}つ以上必要です（現在${speakerTopics.length}件）`)
      setLoading(false)
      return
    }
    const shuffled = [...speakerTopics].sort(() => Math.random() - 0.5)
    const picked = shuffled.slice(0, gachaCount)
    await supabase.from('gacha_rounds').insert({
      speaker_id: selectedSpeaker, topic_ids: picked.map(t => t.id), status: 'gacha',
    })
    setLoading(false)
    onRoundChange()
  }

  async function startVoting() {
    if (!activeRound) return
    const deadline = new Date(Date.now() + votingMinutes * 60 * 1000).toISOString()
    await supabase.from('gacha_rounds').update({ status: 'voting', voting_deadline: deadline }).eq('id', activeRound.id)
    onRoundChange()
  }

  async function closeVoting() {
    if (!activeRound) return
    const { data: votes } = await supabase.from('gacha_votes').select('topic_id').eq('round_id', activeRound.id)
    let winnerId = activeRound.topic_ids?.[0] || ''
    if (votes && votes.length > 0) {
      const counts: Record<string, number> = {}
      for (const v of votes) { counts[v.topic_id] = (counts[v.topic_id] || 0) + 1 }
      winnerId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
    }
    await supabase.from('gacha_rounds').update({ status: 'closed', winner_topic_id: winnerId }).eq('id', activeRound.id)
    onRoundChange(); fetchRounds()
  }

  async function cancelRound() {
    if (!activeRound) return
    await supabase.from('gacha_rounds').delete().eq('id', activeRound.id)
    onRoundChange()
  }

  const speakerTopicCounts = SPEAKERS.map(s => ({
    ...s, count: topics.filter(t => t.speaker_id === s.id).length,
  }))

  return (
    <div className="min-h-dvh">
      {/* Header */}
      <div className="px-4 py-3" style={{
        background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.3)',
      }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/gacha_machine.png" className="w-7 h-7 object-contain" />
            <span className="font-black text-sm"
              style={{ background: 'linear-gradient(135deg, #e84393, #f39c12)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ガチャトーク
            </span>
            <span className="text-white text-[10px] font-black px-2 py-0.5 rounded-full"
              style={{ background: 'linear-gradient(135deg, #e84393, #6c5ce7)' }}>ADMIN</span>
          </div>
          <div className="text-xs font-bold" style={{ color: 'var(--text2)' }}>総お題数: {topics.length}</div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">

        {/* 📖 操作マニュアル */}
        <div style={{
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
          borderRadius: 'var(--radius)', border: '1px solid rgba(255,255,255,0.6)',
          boxShadow: '6px 6px 18px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}>
          <button onClick={() => setShowGuide(!showGuide)}
            className="w-full px-6 py-4 flex items-center justify-between text-left"
            style={{ background: 'transparent', border: 'none' }}>
            <span className="text-sm font-black flex items-center gap-2" style={{ color: 'var(--text)' }}>
              📖 操作ガイド
            </span>
            <span className="text-xs font-bold px-3 py-1 rounded-full"
              style={{ background: showGuide ? '#ffe8f0' : 'rgba(0,0,0,0.04)', color: showGuide ? '#e84393' : 'var(--text3)' }}>
              {showGuide ? '閉じる ▲' : '開く ▼'}
            </span>
          </button>

          {showGuide && (
            <div className="px-6 pb-5 space-y-4 animate-fade-in">
              {[
                {
                  step: '① 事前準備',
                  icon: '📝',
                  color: '#6c5ce7',
                  items: [
                    '参加者にURLを共有（QRコード）',
                    '参加者はニックネーム入力後、お題を投稿',
                    '不適切なお題は下の「お題一覧」から削除',
                  ],
                },
                {
                  step: '② ガチャを回す',
                  icon: '🎰',
                  color: '#e84393',
                  items: [
                    '話を聞きたい登壇者を選ぶ',
                    '「ガチャを回す！」ボタンをタップ',
                    '→ 全員の画面にガチャ演出が表示される',
                  ],
                },
                {
                  step: '③ 投票開始',
                  icon: '🗳️',
                  color: '#00b894',
                  items: [
                    '投票時間を選ぶ（1〜5分）',
                    '「投票開始」ボタンをタップ',
                    '→ 全員の画面に投票画面が表示される',
                    '参加者はお題から1つを選んでタップ',
                  ],
                },
                {
                  step: '④ 結果発表',
                  icon: '🏆',
                  color: '#f7a44c',
                  items: [
                    '投票を締め切りたい時に「投票を締め切って結果発表」',
                    '→ 全員の画面に結果が表示される',
                    'トークが終わったら「次のラウンドへ」で次に進む',
                  ],
                },
              ].map(({ step, icon, color, items }) => (
                <div key={step} className="p-3" style={{
                  background: `${color}08`, borderRadius: '16px',
                  borderLeft: `4px solid ${color}`,
                }}>
                  <div className="text-sm font-black mb-1" style={{ color }}>
                    {icon} {step}
                  </div>
                  <ul className="space-y-0.5 pl-1">
                    {items.map((item, i) => (
                      <li key={i} className="text-xs font-medium flex gap-1.5" style={{ color: 'var(--text2)' }}>
                        <span style={{ color }}>•</span> {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              <div className="p-3 text-center" style={{
                background: 'rgba(108,92,231,0.05)', borderRadius: '12px',
              }}>
                <p className="text-[11px] font-bold" style={{ color: 'var(--text3)' }}>
                  💡 ②→③→④ を繰り返してラウンドを進めてください
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Gacha Control */}
        <div className="p-6" style={{
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
          borderRadius: 'var(--radius)', border: '1px solid rgba(255,255,255,0.6)',
          boxShadow: '6px 6px 18px rgba(0,0,0,0.04)',
        }}>
          <h3 className="text-lg font-black mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <img src="/gacha_machine.png" className="w-6 h-6 object-contain" /> ガチャコントロール
          </h3>

          {!activeRound || activeRound.status === 'closed' ? (
            <div className="space-y-4">
              {activeRound?.status === 'closed' && (
                <div className="mb-4 p-4 text-center" style={{
                  background: '#fff0f5', borderRadius: '16px', border: '2px solid rgba(232,67,147,0.15)',
                }}>
                  <p className="text-sm font-bold mb-3" style={{ color: '#e84393' }}>
                    🏆 結果発表中（参加者の画面に表示中）
                  </p>
                  <button onClick={async () => {
                    // Delete used topics from pool, then archive
                    if (activeRound.topic_ids?.length) {
                      await supabase.from('gacha_topics').delete().in('id', activeRound.topic_ids)
                    }
                    await supabase.from('gacha_rounds').update({ status: 'archived' }).eq('id', activeRound.id)
                    onRoundChange(); fetchRounds(); fetchTopics()
                  }}
                    className="px-8 py-3 font-bold text-sm text-white"
                    style={{ background: 'linear-gradient(135deg, #6c5ce7, #a855f7)', borderRadius: '16px', border: 'none',
                      boxShadow: '4px 4px 12px rgba(108,92,231,0.3)' }}>
                    ✨ 次のラウンドへ（使ったお題は消えます）
                  </button>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                {speakerTopicCounts.map(s => (
                  <button key={s.id} onClick={() => setSelectedSpeaker(s.id)}
                    className="p-4 text-center transition-all"
                    style={{
                      background: selectedSpeaker === s.id ? s.bg : 'rgba(255,255,255,0.6)',
                      borderRadius: 'var(--radius)',
                      border: `2px solid ${selectedSpeaker === s.id ? s.color + '40' : 'rgba(0,0,0,0.04)'}`,
                      boxShadow: selectedSpeaker === s.id
                        ? `inset 2px 2px 6px ${s.color}15`
                        : '3px 3px 8px rgba(0,0,0,0.04)',
                      transform: selectedSpeaker === s.id ? 'scale(0.97)' : 'scale(1)',
                    }}>
                    <img src={s.image} className="w-12 h-12 rounded-full object-cover mx-auto mb-2"
                      style={{ border: `3px solid ${s.color}30` }} />
                    <div className="text-xs font-bold" style={{ color: selectedSpeaker === s.id ? s.color : 'var(--text)' }}>
                      {s.name.split('（')[0].split('スタイル')[0]}
                    </div>
                    <div className="text-xs mt-1 font-bold" style={{ color: 'var(--text3)' }}>{s.count}件</div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold whitespace-nowrap" style={{ color: 'var(--text2)' }}>抽選数</label>
                  <div className="flex gap-1">
                    {[2, 3, 4, 5].map(n => (
                      <button key={n} onClick={() => setGachaCount(n)}
                        className="w-8 h-8 text-sm font-black rounded-xl transition-all"
                        style={{
                          background: gachaCount === n ? 'linear-gradient(135deg, #e84393, #f39c12)' : 'rgba(255,255,255,0.6)',
                          color: gachaCount === n ? 'white' : 'var(--text2)',
                          border: gachaCount === n ? 'none' : '1px solid rgba(0,0,0,0.06)',
                          boxShadow: gachaCount === n ? '2px 2px 8px rgba(232,67,147,0.3)' : 'none',
                        }}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={startGacha} disabled={loading}
                  className="flex-1 py-3 font-black text-base neu-btn-primary">
                  {loading ? '処理中...' : `🎰 ガチャ ${gachaCount}連！`}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Active Round Info */}
              {(() => {
                const roundSpeaker = SPEAKERS.find(s => s.id === activeRound.speaker_id)
                const statusLabel = activeRound.status === 'gacha' ? '✨ ガチャ演出中' : '🗳️ 投票中'
                const statusBg = activeRound.status === 'gacha' ? '#fff0db' : '#d4f5e2'
                const statusColor = activeRound.status === 'gacha' ? '#f7a44c' : '#00b894'
                return (
                  <div className="p-4" style={{
                    background: roundSpeaker?.light, borderRadius: '16px',
                    border: `2px solid ${roundSpeaker?.color}20`,
                  }}>
                    <div className="flex items-center gap-2 mb-2">
                      <img src={roundSpeaker?.image} className="w-8 h-8 rounded-full object-cover"
                        style={{ border: `2px solid ${roundSpeaker?.color}30` }} />
                      <span className="text-sm font-bold" style={{ color: roundSpeaker?.color }}>
                        {roundSpeaker?.name}
                      </span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: statusBg, color: statusColor }}>
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                )
              })()}

              {activeRound.status === 'gacha' && (
                <div className="flex gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <label className="text-xs font-bold whitespace-nowrap" style={{ color: 'var(--text2)' }}>投票時間</label>
                    <select value={votingMinutes} onChange={e => setVotingMinutes(Number(e.target.value))}
                      className="flex-1 px-3 py-2 text-sm font-bold outline-none"
                      style={{ background: 'rgba(255,255,255,0.6)', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }}>
                      <option value={1}>1分</option><option value={2}>2分</option>
                      <option value={3}>3分</option><option value={5}>5分</option>
                    </select>
                  </div>
                  <button onClick={startVoting}
                    className="px-6 py-2 font-bold text-sm text-white"
                    style={{ background: 'linear-gradient(135deg, #00b894, #1dd1a1)', borderRadius: '16px', border: 'none' }}>
                    🗳️ 投票開始
                  </button>
                  <button onClick={cancelRound}
                    className="px-4 py-2 text-sm font-bold"
                    style={{ background: 'rgba(255,255,255,0.6)', borderRadius: '12px', color: '#e84393', border: '1px solid rgba(232,67,147,0.15)' }}>
                    ✕
                  </button>
                </div>
              )}

              {activeRound.status === 'voting' && (
                <div className="flex gap-3">
                  <button onClick={closeVoting}
                    className="flex-1 py-3 font-bold text-sm text-white"
                    style={{ background: 'linear-gradient(135deg, #f7a44c, #e84393)', borderRadius: '16px', border: 'none',
                      boxShadow: '4px 4px 12px rgba(247,164,76,0.3)' }}>
                    🏆 投票を締め切って結果発表
                  </button>
                  <button onClick={cancelRound}
                    className="px-4 py-3 text-sm font-bold"
                    style={{ background: 'rgba(255,255,255,0.6)', borderRadius: '12px', color: '#e84393', border: '1px solid rgba(232,67,147,0.15)' }}>
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Topic Management */}
        <div className="p-6" style={{
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
          borderRadius: 'var(--radius)', border: '1px solid rgba(255,255,255,0.6)',
          boxShadow: '6px 6px 18px rgba(0,0,0,0.04)',
        }}>
          <h3 className="text-lg font-black mb-4" style={{ color: 'var(--text)' }}>📋 お題一覧</h3>
          <div className="space-y-6">
            {SPEAKERS.map(speaker => {
              const sTopics = topics.filter(t => t.speaker_id === speaker.id)
              return (
                <div key={speaker.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <img src={speaker.image} className="w-7 h-7 rounded-full object-cover"
                      style={{ border: `2px solid ${speaker.color}30` }} />
                    <span className="text-sm font-bold" style={{ color: speaker.color }}>{speaker.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: speaker.bg, color: speaker.color }}>{sTopics.length}件</span>
                  </div>
                  {sTopics.length === 0 ? (
                    <p className="text-xs pl-9" style={{ color: 'var(--text3)' }}>まだお題がありません</p>
                  ) : (
                    <div className="space-y-2 pl-9">
                      {sTopics.map(topic => (
                        <div key={topic.id}
                          className="flex items-start gap-3 px-4 py-3 group"
                          style={{ background: speaker.light, borderRadius: '16px', border: `1px solid ${speaker.color}10` }}>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{topic.text}</p>
                            <p className="text-[10px] mt-1" style={{ color: 'var(--text3)' }}>
                              by {topic.submitted_by} · {new Date(topic.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <button onClick={() => deleteTopic(topic.id)}
                            className="text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity shrink-0 px-2 py-1 rounded-lg"
                            style={{ color: '#e84393', background: 'rgba(232,67,147,0.08)' }}>
                            削除
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Past Rounds */}
        {rounds.filter(r => r.status === 'closed').length > 0 && (
          <div className="p-6" style={{
            background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
            borderRadius: 'var(--radius)', border: '1px solid rgba(255,255,255,0.6)',
            boxShadow: '6px 6px 18px rgba(0,0,0,0.04)',
          }}>
            <h3 className="text-lg font-black mb-4" style={{ color: 'var(--text)' }}>📊 過去のラウンド</h3>
            <div className="space-y-3">
              {rounds.filter(r => r.status === 'closed').map(round => (
                <ResultScreen key={round.id} round={round} compact />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

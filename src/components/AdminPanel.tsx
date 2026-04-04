import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { SPEAKERS } from '../types'
import type { GachaRound, Topic } from '../types'
import { ResultScreen } from './ResultScreen'

interface Props {
  activeRound: GachaRound | null
  onRoundChange: () => void
  onExitAdmin?: () => void
}

export function AdminPanel({ activeRound, onRoundChange, onExitAdmin }: Props) {
  const [topics, setTopics] = useState<Topic[]>([])
  const [rounds, setRounds] = useState<GachaRound[]>([])
  const [selectedSpeaker, setSelectedSpeaker] = useState(SPEAKERS[0].id)
  const [votingMinutes, setVotingMinutes] = useState(3)
  const [loading, setLoading] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [gachaCount, setGachaCount] = useState(3)
  const [adminTab, setAdminTab] = useState<'gacha' | 'poll'>('gacha')

  // Submission deadline settings
  const [deadlineEnabled, setDeadlineEnabled] = useState(false)
  const [deadlineDatetime, setDeadlineDatetime] = useState('')
  const [deadlineSaving, setDeadlineSaving] = useState(false)

  // Quick Poll States
  const [polls, setPolls] = useState<any[]>([])
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState(['', '', ''])
  const [pollVotes, setPollVotes] = useState<Record<string, number>>({})
  const [pollDetailedVotes, setPollDetailedVotes] = useState<Record<string, Record<number, number>>>({})
  const [pollSpeakerId, setPollSpeakerId] = useState(SPEAKERS[0].id)

  const fetchTopics = useCallback(async () => {
    const { data } = await supabase.from('gacha_topics').select('*').order('created_at', { ascending: false })
    if (data) setTopics(data as Topic[])
  }, [])

  const fetchRounds = useCallback(async () => {
    const { data } = await supabase.from('gacha_rounds').select('*').order('created_at', { ascending: false }).limit(20)
    if (data) setRounds(data as GachaRound[])
  }, [])

  const fetchPolls = useCallback(async () => {
    const { data: pollData } = await supabase.from('quick_polls').select('*').order('created_at', { ascending: false })
    if (pollData) setPolls(pollData)

    const activeIds = pollData?.filter(p => p.status !== 'draft').map(p => p.id) || []
    if (activeIds.length > 0) {
      const { data: voteData } = await supabase.from('quick_poll_votes').select('*').in('poll_id', activeIds)
      if (voteData) {
        const counts: Record<string, number> = {}
        const detailed: Record<string, Record<number, number>> = {}
        voteData.forEach(v => { 
          counts[v.poll_id] = (counts[v.poll_id] || 0) + 1 
          if (!detailed[v.poll_id]) detailed[v.poll_id] = {}
          detailed[v.poll_id][v.option_index] = (detailed[v.poll_id][v.option_index] || 0) + 1
        })
        setPollVotes(counts)
        setPollDetailedVotes(detailed)
      }
    }
  }, [])

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase.from('gacha_settings').select('*').eq('id', 'global').single()
    if (data) {
      setDeadlineEnabled(data.submission_deadline_enabled ?? false)
      if (data.submission_deadline) {
        // Convert UTC ISO string to local datetime-local input format
        const d = new Date(data.submission_deadline)
        const pad = (n: number) => String(n).padStart(2, '0')
        setDeadlineDatetime(
          `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
        )
      } else {
        setDeadlineDatetime('')
      }
    }
  }, [])

  async function saveDeadlineSettings(enabled: boolean, datetime: string) {
    setDeadlineSaving(true)
    await supabase.from('gacha_settings').upsert({
      id: 'global',
      submission_deadline_enabled: enabled,
      submission_deadline: enabled && datetime ? new Date(datetime).toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    setDeadlineSaving(false)
  }

  useEffect(() => {
    fetchTopics()
    fetchRounds()
    fetchPolls()
    fetchSettings()
    const ch1 = supabase.channel('admin_topics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gacha_topics' }, fetchTopics).subscribe()
    const ch2 = supabase.channel('admin_rounds')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gacha_rounds' }, () => { fetchRounds(); onRoundChange() }).subscribe()
    const ch3 = supabase.channel('admin_votes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gacha_votes' }, fetchRounds).subscribe()
    const ch4 = supabase.channel('admin_quick_polls')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quick_polls' }, fetchPolls).subscribe()
    const ch5 = supabase.channel('admin_quick_poll_votes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quick_poll_votes' }, fetchPolls).subscribe()
    const ch6 = supabase.channel('admin_settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gacha_settings' }, fetchSettings).subscribe()
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); supabase.removeChannel(ch3); supabase.removeChannel(ch4); supabase.removeChannel(ch5); supabase.removeChannel(ch6) }
  }, [fetchTopics, fetchRounds, fetchPolls, fetchSettings, onRoundChange])

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

  async function createPoll() {
    const opts = pollOptions.filter(o => o.trim())
    if (!pollQuestion.trim() || opts.length < 2) {
      alert('質問と、2つ以上の選択肢を入力してください')
      return
    }
    setLoading(true)
    await supabase.from('quick_polls').insert({ 
      question: pollQuestion, 
      options: opts,
      speaker_id: pollSpeakerId,
      status: 'draft' 
    })
    setPollQuestion('')
    setPollOptions(['', '', ''])
    setLoading(false)
  }

  async function deletePoll(id: string) {
    if (!window.confirm('このアンケートを削除してもよろしいですか？')) return
    await supabase.from('quick_polls').delete().eq('id', id)
  }

  async function startPoll(id: string) {
    if (activePoll) {
      await supabase.from('quick_polls').update({ status: 'closed' }).eq('id', activePoll.id)
    }
    await supabase.from('quick_polls').update({ status: 'active' }).eq('id', id)
  }

  async function closePoll(id: string) {
    await supabase.from('quick_polls').update({ status: 'closed' }).eq('id', id)
  }

  const activePoll = polls.find(p => p.status === 'active')

  return (
    <div className="min-h-dvh">
      {/* Header */}
      <div className="px-4 py-3" style={{
        background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.3)',
      }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/90 rounded-xl flex items-center justify-center shadow-sm border border-white/50 overflow-hidden">
              <img src="/gacha_machine.png" className="w-6 h-6 object-contain rounded-md" style={{ mixBlendMode: 'multiply' }} />
            </div>
            <span className="font-black text-sm"
              style={{ background: 'linear-gradient(135deg, #e84393, #f39c12)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ガチャトーク
            </span>
            <span className="text-white text-[10px] font-black px-2 py-0.5 rounded-full"
              style={{ background: 'linear-gradient(135deg, #e84393, #6c5ce7)' }}>ADMIN</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs font-bold" style={{ color: 'var(--text2)' }}>総お題数: {topics.length}</div>
            {onExitAdmin && (
              <button onClick={onExitAdmin} className="text-[11px] font-bold px-3 py-2 rounded-full shadow-sm hover:opacity-80 transition-all"
                style={{ background: 'linear-gradient(135deg, #00b894, #00cec9)', color: 'white' }}>
                👀 参加者画面に戻る
              </button>
            )}
          </div>
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
              {(adminTab === 'gacha' ? [
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
              ] : [
                {
                  step: '① アンケート作成',
                  icon: '📝',
                  color: '#6c5ce7',
                  items: [
                    '誰のアンケートかを選ぶ',
                    '質問と選択肢を入力する',
                    '「📦 事前にストックする」で出番待ちに追加',
                  ],
                },
                {
                  step: '② アンケート開始',
                  icon: '▶️',
                  color: '#e84393',
                  items: [
                    'ストック一覧から「▶ スタート」を押す',
                    '→ 全員の画面がアンケート画面に切り替わる',
                  ],
                },
                {
                  step: '③ リアルタイム投票',
                  icon: '📈',
                  color: '#00b894',
                  items: [
                    '参加者が投票すると、画面のグラフがリアルタイムで動く',
                    '管理者は現在の票数を確認しながら進行する',
                  ],
                },
                {
                  step: '④ アンケート終了',
                  icon: '🏁',
                  color: '#f7a44c',
                  items: [
                    '「アンケートを終了する」ボタンを押す',
                    '→ 全員の画面が元の投稿画面に戻る',
                    '終了した結果は、画面下の履歴に残る',
                  ],
                },
              ]).map(({ step, icon, color, items }) => (
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

        {/* 📑 タブナビゲーション */}
        <div className="flex gap-3 px-1">
          <button onClick={() => setAdminTab('gacha')}
            className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${adminTab === 'gacha' ? 'shadow-md shadow-[rgba(232,67,147,0.15)]' : ''}`}
            style={{
              background: adminTab === 'gacha' ? 'linear-gradient(135deg, #e84393, #f39c12)' : 'rgba(255,255,255,0.6)',
              color: adminTab === 'gacha' ? 'white' : 'var(--text2)',
              border: adminTab === 'gacha' ? 'none' : '1px solid rgba(0,0,0,0.06)',
            }}>
            🎰 ガチャとお題
          </button>
          <button onClick={() => setAdminTab('poll')}
            className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${adminTab === 'poll' ? 'shadow-md shadow-[rgba(168,85,247,0.15)]' : ''}`}
            style={{
              background: adminTab === 'poll' ? 'linear-gradient(135deg, #a855f7, #6c5ce7)' : 'rgba(255,255,255,0.6)',
              color: adminTab === 'poll' ? 'white' : 'var(--text2)',
              border: adminTab === 'poll' ? 'none' : '1px solid rgba(0,0,0,0.06)',
            }}>
            🎤 会場アンケート
          </button>
        </div>

        {adminTab === 'gacha' && (
          <div className="space-y-8 animate-fade-in">
        {/* Gacha Control */}
        <div className="p-6" style={{
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
          borderRadius: 'var(--radius)', border: '1px solid rgba(255,255,255,0.6)',
          boxShadow: '6px 6px 18px rgba(0,0,0,0.04)',
        }}>
          <h3 className="text-lg font-black mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm border border-black/5 overflow-hidden">
              <img src="/gacha_machine.png" className="w-6 h-6 object-contain rounded-md" style={{ mixBlendMode: 'multiply' }} />
            </div>
            ガチャコントロール
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

        {/* Submission Deadline Settings */}
        <div className="p-6" style={{
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
          borderRadius: 'var(--radius)', border: '1px solid rgba(255,255,255,0.6)',
          boxShadow: '6px 6px 18px rgba(0,0,0,0.04)',
        }}>
          <h3 className="text-base font-black mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
            ⏰ 質問受付の締め切り設定
          </h3>

          {/* Toggle */}
          <div className="flex items-center justify-between p-4 rounded-2xl mb-4" style={{
            background: deadlineEnabled ? 'rgba(232,67,147,0.06)' : 'rgba(0,0,0,0.03)',
            border: `1px solid ${deadlineEnabled ? 'rgba(232,67,147,0.15)' : 'rgba(0,0,0,0.06)'}`,
          }}>
            <div>
              <p className="text-sm font-black" style={{ color: deadlineEnabled ? '#e84393' : 'var(--text)' }}>
                {deadlineEnabled ? '🔒 締め切りを設定中' : '✅ 質問受付中（制限なし）'}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text3)' }}>
                {deadlineEnabled ? '締め切り日時を過ぎると投稿フォームが非表示になります' : 'オンにすると締め切り日時を設定できます'}
              </p>
            </div>
            <button
              onClick={() => {
                const next = !deadlineEnabled
                setDeadlineEnabled(next)
                saveDeadlineSettings(next, deadlineDatetime)
              }}
              className="relative w-14 h-7 rounded-full transition-all duration-300 flex-shrink-0 ml-4"
              style={{
                background: deadlineEnabled
                  ? 'linear-gradient(135deg, #e84393, #f39c12)'
                  : 'rgba(0,0,0,0.12)',
              }}
            >
              <span
                className="absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300"
                style={{ left: deadlineEnabled ? 'calc(100% - 26px)' : '2px' }}
              />
            </button>
          </div>

          {/* Datetime picker — only shown when enabled */}
          {deadlineEnabled && (
            <div className="space-y-3 animate-fade-in">
              <label className="text-xs font-black" style={{ color: 'var(--text2)' }}>締め切り日時</label>
              <div className="flex gap-2">
                <input
                  type="datetime-local"
                  value={deadlineDatetime}
                  onChange={e => setDeadlineDatetime(e.target.value)}
                  className="flex-1 px-4 py-3 text-sm font-bold outline-none"
                  style={{
                    background: 'white', borderRadius: '14px',
                    border: '1px solid rgba(232,67,147,0.15)', color: 'var(--text)',
                  }}
                />
                <button
                  onClick={() => saveDeadlineSettings(deadlineEnabled, deadlineDatetime)}
                  disabled={deadlineSaving || !deadlineDatetime}
                  className="px-5 py-3 text-sm font-black text-white disabled:opacity-40 transition-all"
                  style={{
                    background: 'linear-gradient(135deg, #e84393, #f39c12)',
                    borderRadius: '14px', border: 'none',
                    boxShadow: '3px 3px 10px rgba(232,67,147,0.25)',
                  }}
                >
                  {deadlineSaving ? '保存中...' : '保存'}
                </button>
              </div>
              {deadlineDatetime && (
                <p className="text-xs font-bold" style={{ color: '#e84393' }}>
                  {new Date(deadlineDatetime) > new Date()
                    ? `⏳ 締め切りまで残り ${Math.ceil((new Date(deadlineDatetime).getTime() - Date.now()) / 60000)} 分`
                    : '🔒 現在、質問受付は締め切られています'}
                </p>
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
      )}

      {adminTab === 'poll' && (
      <div className="space-y-8 animate-fade-in">
        {/* 🤔 登壇者からのクイックアンケート機能 */}
        <div className="p-6" style={{
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
          borderRadius: 'var(--radius)', border: '1px solid rgba(255,255,255,0.6)',
          boxShadow: '6px 6px 18px rgba(0,0,0,0.04)',
        }}>
          <h3 className="text-lg font-black mb-4 flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <span>🎤 会場アンケート</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#f3e8ff', color: '#9333ea' }}>NEW</span>
          </h3>

          {activePoll ? (
            <div className="p-5" style={{ background: '#f3e8ff', borderRadius: '16px', border: '1px solid #d8b4fe' }}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold" style={{ color: '#7e22ce' }}>配信中：{activePoll.question}</h4>
                <div className="text-xs font-black px-3 py-1 rounded-full bg-white" style={{ color: '#9333ea' }}>
                  現在 {pollVotes[activePoll.id] || 0} 票
                </div>
              </div>
              <ul className="mb-5 space-y-2">
                {activePoll.options.map((opt: string, i: number) => (
                  <li key={i} className="text-xs font-bold px-3 py-2 bg-white rounded-lg" style={{ color: 'var(--text)' }}>
                    {String.fromCharCode(65 + i)}. {opt}
                  </li>
                ))}
              </ul>
              <button onClick={() => closePoll(activePoll.id)}
                className="w-full py-3 font-bold text-sm text-white"
                style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', borderRadius: '12px', border: 'none' }}>
                アンケートを終了する
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2">
                {SPEAKERS.map(s => (
                  <button key={s.id} onClick={() => setPollSpeakerId(s.id)}
                    className="p-1 rounded-full transition-all"
                    style={{ border: `3px solid ${pollSpeakerId === s.id ? s.color : 'transparent'}` }}>
                    <img src={s.image} className="w-8 h-8 rounded-full object-cover" />
                  </button>
                ))}
              </div>

              <input type="text" placeholder="質問を入力...（例：今日一番印象に残ったのは？）"
                value={pollQuestion} onChange={e => setPollQuestion(e.target.value)}
                className="w-full px-4 py-3 text-sm font-bold outline-none"
                style={{ background: 'white', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)', color: 'var(--text)' }} />
              
              <div className="space-y-2 pl-2">
                {pollOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs font-bold" style={{ color: 'var(--text3)' }}>{String.fromCharCode(65 + i)}</span>
                    <input type="text" placeholder={`選択肢 ${i + 1}`}
                      value={opt} onChange={e => {
                        const newOpts = [...pollOptions]
                        newOpts[i] = e.target.value
                        setPollOptions(newOpts)
                      }}
                      className="flex-1 px-3 py-2 text-sm font-bold outline-none"
                      style={{ background: 'white', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)' }} />
                    {pollOptions.length > 2 && (
                      <button onClick={() => {
                        const newOpts = [...pollOptions]
                        newOpts.splice(i, 1)
                        setPollOptions(newOpts)
                      }}
                      className="text-[10px] font-bold px-2 py-1.5 rounded bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-500 transition-colors">
                        ✖
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => { if(pollOptions.length < 5) setPollOptions([...pollOptions, '']) }}
                  className="px-4 py-3 text-xs font-bold transition-all"
                  style={{ background: 'rgba(0,0,0,0.04)', color: 'var(--text2)', borderRadius: '12px' }}>
                  ＋ 選択肢追加
                </button>
                <button onClick={createPoll} disabled={loading}
                  className="flex-1 py-3 text-sm font-bold transition-all hover:opacity-90"
                  style={{ background: '#f3e8ff', color: '#9333ea', borderRadius: '12px' }}>
                  📦 事前にストックする（下書き）
                </button>
              </div>

              {/* Draft Polls List */}
              {polls.filter(p => p.status === 'draft').length > 0 && (
                <div className="pt-6 mt-6 border-t border-purple-100">
                  <h4 className="text-xs font-black mb-3 flex items-center gap-2" style={{ color: '#9333ea' }}>
                    📦 ストック済みのアンケート（出番待ち）
                  </h4>
                  <div className="space-y-3">
                    {polls.filter(p => p.status === 'draft').map(dp => {
                      const sp = SPEAKERS.find(s => s.id === dp.speaker_id) || SPEAKERS[0]
                      return (
                        <div key={dp.id} className="p-3 bg-white rounded-xl border border-black/5 flex items-center gap-3">
                          <img src={sp.image} className="w-10 h-10 rounded-full object-cover shrink-0"
                            style={{ border: `2px solid ${sp.color}40` }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-800 line-clamp-1">{dp.question}</p>
                            <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">
                              {dp.options.map((o: string, i: number) => `${String.fromCharCode(65 + i)}: ${o}`).join(' / ')}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => startPoll(dp.id)}
                              className="px-3 py-2 text-xs font-bold text-white shadow-sm rounded-lg"
                              style={{ background: 'linear-gradient(135deg, #a855f7, #6c5ce7)' }}>
                              ▶ スタート
                            </button>
                            <button onClick={() => deletePoll(dp.id)}
                              className="px-2 py-2 text-xs font-bold text-gray-400 bg-gray-100 rounded-lg hover:bg-red-100 hover:text-red-500 transition-colors">
                              🗑️
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Closed Polls List (History) */}
              {polls.filter(p => p.status === 'closed').length > 0 && (
                <div className="pt-6 mt-6 border-t border-purple-100">
                  <h4 className="text-xs font-black mb-3 flex items-center gap-2" style={{ color: 'var(--text2)' }}>
                    📊 終了したアンケート結果
                  </h4>
                  <div className="space-y-3">
                    {polls.filter(p => p.status === 'closed').map(cp => {
                      const sp = SPEAKERS.find(s => s.id === cp.speaker_id) || SPEAKERS[0]
                      const total = pollVotes[cp.id] || 0
                      const detailed = pollDetailedVotes[cp.id] || {}
                      return (
                        <div key={cp.id} className="p-4 bg-white/60 rounded-xl border border-black/5 relative relative group">
                          <button onClick={() => deletePoll(cp.id)}
                            className="absolute top-2 right-2 px-2 py-1 text-[10px] font-bold text-gray-400 bg-white border border-gray-200 rounded-md hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                            削除
                          </button>
                          <div className="flex items-start gap-3 mb-3 pr-8">
                            <img src={sp.image} className="w-8 h-8 rounded-full object-cover shrink-0 grayscale opacity-60" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-600 leading-tight">{cp.question}</p>
                              <p className="text-[10px] text-gray-400 mt-1">合計: {total}票</p>
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            {cp.options.map((opt: string, i: number) => {
                              const count = detailed[i] || 0
                              const pct = total > 0 ? Math.round((count / total) * 100) : 0
                              return (
                                <div key={i} className="relative w-full h-7 bg-gray-100 rounded-lg overflow-hidden flex items-center px-3 z-0">
                                  <div className="absolute top-0 left-0 bottom-0 bg-purple-200 opacity-50 -z-10" style={{ width: `${pct}%` }} />
                                  <div className="flex justify-between w-full text-xs">
                                    <span className="font-bold text-gray-600 truncate mr-2">{String.fromCharCode(65 + i)}: {opt}</span>
                                    <span className="font-black text-gray-500 shrink-0">{count}票 ({pct}%)</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      )}

      </div>
    </div>
  )
}

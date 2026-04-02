import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { getNickname, setNickname as saveNickname } from './types'
import type { GachaRound } from './types'
import { NicknameEntry } from './components/NicknameEntry'
import { TopicSubmit } from './components/TopicSubmit'
import { GachaAnimation } from './components/GachaAnimation'
import { VotingPanel } from './components/VotingPanel'
import { ResultScreen } from './components/ResultScreen'
import { AdminPanel } from './components/AdminPanel'
import { QuickPollView } from './components/QuickPollView'
import './index.css'

export default function App() {
  const [nickname, setNicknameState] = useState(getNickname())
  const [isAdmin, setIsAdmin] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState(false)
  const [activeRound, setActiveRound] = useState<GachaRound | null>(null)
  const [activePoll, setActivePoll] = useState<any>(null)

  // Check admin mode from URL (legacy support)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('admin') === import.meta.env.VITE_ADMIN_PASSWORD) {
      setIsAdmin(true)
    }
  }, [])

  // Subscribe to active gacha rounds
  useEffect(() => {
    fetchActiveRound()

    const channel = supabase
      .channel('gacha_rounds_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'gacha_rounds',
      }, () => {
        fetchActiveRound()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function fetchActiveRound() {
    const { data } = await supabase
      .from('gacha_rounds')
      .select('*')
      .in('status', ['gacha', 'voting', 'closed'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    setActiveRound(data as GachaRound | null)
  }

  // Subscribe to quick polls
  useEffect(() => {
    fetchActivePoll()
    const ch = supabase.channel('quick_polls_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quick_polls' }, fetchActivePoll)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  async function fetchActivePoll() {
    const { data } = await supabase
      .from('quick_polls')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setActivePoll(data)
  }

  const handleSetNickname = (name: string) => {
    saveNickname(name)
    setNicknameState(name)
  }

  function handlePasswordSubmit() {
    if (passwordInput === import.meta.env.VITE_ADMIN_PASSWORD) {
      setIsAdmin(true)
      setShowPasswordDialog(false)
      setPasswordInput('')
      setPasswordError(false)
    } else {
      setPasswordError(true)
      setPasswordInput('')
    }
  }

  // Admin view
  if (isAdmin) {
    return <AdminPanel activeRound={activeRound} onRoundChange={fetchActiveRound} onExitAdmin={() => setIsAdmin(false)} />
  }

  // Render main screen component based on state
  const renderScreen = () => {
    if (!nickname) {
      return <NicknameEntry onSubmit={handleSetNickname} />
    }

    if (activePoll) {
      return <QuickPollView poll={activePoll} />
    }

    if (activeRound) {
      if (activeRound.status === 'gacha') {
        return <GachaAnimation round={activeRound} />
      }
      if (activeRound.status === 'voting') {
        return <VotingPanel round={activeRound} />
      }
      if (activeRound.status === 'closed' && activeRound.winner_topic_id) {
        return <ResultScreen round={activeRound} />
      }
    }

    return <TopicSubmit nickname={nickname} />
  }

  return (
    <div className="min-h-dvh flex flex-col relative w-full">
      {renderScreen()}

      {/* Admin icon - bottom right */}
      <button
        onClick={() => setShowPasswordDialog(true)}
        className="fixed bottom-5 right-5 z-50 w-10 h-10 flex items-center justify-center rounded-full transition-all"
        style={{
          background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.4)',
          boxShadow: '3px 3px 8px rgba(0,0,0,0.05)',
          opacity: 0.4,
        }}
      >
        <span className="text-sm">⚙️</span>
      </button>

      {/* Password Dialog */}
      {showPasswordDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowPasswordDialog(false); setPasswordError(false) } }}>
          <div className="w-full max-w-xs p-6 animate-pop-in" style={{
            background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)',
            borderRadius: 'var(--radius)',
            border: '1px solid rgba(255,255,255,0.6)',
            boxShadow: '8px 8px 24px rgba(0,0,0,0.08)',
          }}>
            <h3 className="text-sm font-black text-center mb-4" style={{ color: 'var(--text)' }}>
              🔐 管理者パスワード
            </h3>
            <form onSubmit={(e) => { e.preventDefault(); handlePasswordSubmit() }}>
              <input
                type="password"
                value={passwordInput}
                onChange={e => { setPasswordInput(e.target.value); setPasswordError(false) }}
                placeholder="パスワード"
                autoFocus
                className="w-full px-4 py-3 text-sm font-bold outline-none mb-3"
                style={{
                  background: 'rgba(255,255,255,0.7)', borderRadius: '12px',
                  border: `2px solid ${passwordError ? 'rgba(232,67,147,0.5)' : 'rgba(0,0,0,0.06)'}`,
                  color: 'var(--text)',
                }}
              />
              {passwordError && (
                <p className="text-[11px] font-bold text-center mb-3" style={{ color: '#e84393' }}>
                  パスワードが違います
                </p>
              )}
              <button type="submit"
                className="w-full py-3 font-bold text-sm text-white"
                style={{
                  background: 'linear-gradient(135deg, #6c5ce7, #e84393)',
                  borderRadius: '14px', border: 'none',
                  boxShadow: '4px 4px 12px rgba(108,92,231,0.25)',
                }}>
                ログイン
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { SPEAKERS } from '../types'

interface Props {
  onSubmit: (name: string) => void
}

export function NicknameEntry({ onSubmit }: Props) {
  const [name, setName] = useState('')

  return (
    <div className="min-h-dvh flex items-center justify-center p-6">
      <div className="w-full max-w-sm animate-fade-in">

        {/* Gacha Machine */}
        <div className="text-center mb-5 mt-2">
          <div className="mx-auto w-28 h-28 bg-white/90 backdrop-blur-md rounded-[2.5rem] shadow-[0_8px_32px_rgba(232,67,147,0.25)] border-[3px] border-white/80 flex items-center justify-center animate-float overflow-hidden">
            <img src="/gacha_machine.png" alt="ガチャマシン"
              className="w-20 h-20 object-contain rounded-3xl"
              style={{ mixBlendMode: 'multiply' }} />
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-5">
          <h1 className="text-3xl font-black tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #e84393, #f39c12, #00b894, #6c5ce7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.5px'
            }}>
            ガチャトーク
          </h1>
          <p className="text-sm mt-1 font-bold" style={{ color: 'var(--text2)' }}>
            みんなで決める！リアルタイム・トークテーマ ✨
          </p>
        </div>

        {/* Speakers with individual colors */}
        <div className="flex justify-center gap-3 mb-5">
          {SPEAKERS.map(s => (
            <div key={s.id} className="flex flex-col items-center gap-1.5 px-3 py-3"
              style={{
                background: s.light, borderRadius: 'var(--radius)',
                border: `2px solid ${s.color}20`,
                boxShadow: `4px 4px 12px ${s.color}10, -2px -2px 6px rgba(255,255,255,0.8)`,
              }}>
              <img src={s.image} alt={s.name}
                className="w-14 h-14 rounded-full object-cover"
                style={{ border: `3px solid ${s.color}40`, boxShadow: `0 2px 8px ${s.color}15` }} />
              <span className="text-[10px] font-bold text-center leading-tight max-w-[72px]"
                style={{ color: s.color }}>
                {s.name.split('（')[0].split('スタイル')[0]}
              </span>
            </div>
          ))}
        </div>

        {/* Event Banner */}
        <div className="p-4 mb-5 text-center" style={{
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
          borderRadius: 'var(--radius)',
          border: '1px solid rgba(255,255,255,0.6)',
          boxShadow: '4px 4px 12px rgba(0,0,0,0.04)',
        }}>
          <div className="text-[11px] font-black tracking-widest mb-1"
            style={{ color: 'var(--accent)' }}>4/5（日）13:00〜</div>
          <div className="text-sm font-black" style={{ color: 'var(--text)' }}>
            コラボ講演会＆公開コンサル
          </div>
          <div className="text-[11px] mt-1 font-bold" style={{ color: 'var(--text2)' }}>
            〜トモダチだヨ！全員集合〜 🎉
          </div>
        </div>

        {/* Nickname Input - white soft card */}
        <div style={{
          background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)',
          borderRadius: 'var(--radius)',
          border: '1px solid rgba(255,255,255,0.7)',
          boxShadow: '6px 6px 20px rgba(0,0,0,0.04), -3px -3px 10px rgba(255,255,255,0.8)',
          padding: '24px',
        }}>
          <form onSubmit={(e) => { e.preventDefault(); if (name.trim()) onSubmit(name.trim()) }}
            className="space-y-4">
            <div>
              <label className="block text-xs font-black tracking-widest uppercase mb-2"
                style={{ color: 'var(--text2)' }}>
                ニックネーム
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="例：はなこ"
                autoFocus
                className="w-full px-5 py-4 text-lg font-bold outline-none"
                style={{
                  background: 'rgba(255,255,255,0.7)', borderRadius: '16px',
                  border: '2px solid rgba(232,67,147,0.1)',
                  boxShadow: 'inset 2px 2px 6px rgba(0,0,0,0.04)', color: 'var(--text)',
                }}
              />
            </div>
            <button
              type="submit"
              disabled={!name.trim()}
              className="w-full py-4 font-black text-lg neu-btn-primary"
            >
              🎰 参加する
            </button>
            <p className="text-center text-xs font-bold" style={{ color: 'var(--text3)' }}>
              ※投稿のニックネームとして使われます
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

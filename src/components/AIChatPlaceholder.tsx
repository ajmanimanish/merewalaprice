'use client';
import { useState } from 'react';

export default function AIChatPlaceholder() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleNotify = async () => {
    if (!email.includes('@')) return;
    setLoading(true);
    try {
      await fetch('/api/ai-waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Waitlist join failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#141414] 
                   rounded-full flex items-center justify-center 
                   shadow-xl z-40 border-2 border-[#FDDB48] hover:scale-105 transition-all"
        aria-label="AI Shopping Assistant"
      >
        <span className="text-2xl">✨</span>
      </button>

      {/* Bottom sheet modal */}
      {open && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center"
          onClick={() => setOpen(false)}
        >
          <div 
            className="bg-white w-full rounded-t-[24px] p-6 pb-10 max-w-[420px] mx-auto animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-[#EBEBEB] rounded-full mx-auto mb-5"/>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#141414] rounded-full 
                              flex items-center justify-center text-xl">
                ✨
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-[#141414]">
                  AI Shopping Assistant
                </h3>
                <p className="text-[12px] text-[#F0743E] font-semibold">
                  Coming Soon
                </p>
              </div>
            </div>

            {/* Preview of what it will do */}
            <div className="bg-[#FAFAF8] rounded-[16px] p-4 mb-5 space-y-3">
              <p className="text-[13px] font-semibold text-[#141414]">
                What you'll be able to ask:
              </p>
              {[
                '"Which AC for a 150 sqft room in ₹35,000?"',
                '"Is this Samsung TV a good deal today?"',
                '"Compare LG vs Voltas AC in Bhopal prices"',
                '"Best laptop for college under ₹45,000?"'
              ].map((q, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[#F0743E] text-[13px] mt-0.5">→</span>
                  <p className="text-[13px] text-[#6B6B6B] italic">{q}</p>
                </div>
              ))}
            </div>

            <div className="bg-[#FEF0E8] border border-[#F0743E]/20 
                            rounded-[12px] p-4 mb-5">
              <p className="text-[13px] text-[#141414] font-medium leading-relaxed">
                Our AI will have access to <strong>real Bhopal dealer prices</strong> 
                not available on Amazon or Google — and will recommend 
                the best deal for your exact need.
              </p>
            </div>

            {!submitted ? (
              <>
                <p className="text-[13px] text-[#6B6B6B] mb-3">
                  Get notified when we launch:
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="flex-1 h-[46px] px-4 border border-[#EBEBEB] 
                               rounded-[10px] text-[14px] outline-none
                               focus:border-[#F0743E]"
                    disabled={loading}
                  />
                  <button
                    onClick={handleNotify}
                    disabled={loading || !email.includes('@')}
                    className="h-[46px] px-5 bg-[#F0743E] text-white 
                               rounded-[10px] font-bold text-[14px] disabled:opacity-50"
                  >
                    {loading ? '...' : 'Notify Me'}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-2">
                <p className="text-[15px] font-bold text-[#16A34A]">✓ You're on the list!</p>
                <p className="text-[13px] text-[#6B6B6B] mt-1">
                  We'll email you when AI chat launches.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

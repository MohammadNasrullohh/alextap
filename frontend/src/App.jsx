import { useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { 
  Wallet, Zap, ShoppingBag, Pickaxe, MousePointer2, X, 
  Twitter, Send, Calendar, Coins, ArrowBigUpDash, Cpu,
  Trophy, Flame, Rocket, Star, BarChart3, AlertTriangle, CheckCircle2, ShieldCheck, ExternalLink, Info, History
} from "lucide-react";

// ================= CONFIG =================
const HARDHAT_CHAIN_ID = "0x7a69"; // 31337
const HARDHAT_PARAMS = {
  chainId: HARDHAT_CHAIN_ID,
  chainName: "Hardhat Local",
  rpcUrls: ["http://127.0.0.1:8545"],
  nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 }
};

const ALEXCOIN_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const AIRDROP_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

const ALEX_ABI = ["function balanceOf(address) view returns (uint256)"];
const AIRDROP_ABI = [
  "function claim(uint256 amount) external",
  "function fund(uint256 amount) external",
  "function lastClaim(address) view returns (uint256)",
  "event Claimed(address indexed user, uint256 amount)"
];

export default function App() {
  // WALLET & CONTRACT STATES
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [balance, setBalance] = useState(0); 
  const [claiming, setClaiming] = useState(false);
  const [chainId, setChainId] = useState(null);
  const [lastTx, setLastTx] = useState(null);
  const [showTxDetail, setShowTxDetail] = useState(false);
  const [txHistory, setTxHistory] = useState([]);

  // GAMEPLAY STATES
  const [taps, setTaps] = useState(0);
  const [totalPointsFromClicks, setTotalPointsFromClicks] = useState(0);
  const [combo, setCombo] = useState(1);
  const [energy, setEnergy] = useState(100);
  const [floatings, setFloatings] = useState([]);
  const [cooldown, setCooldown] = useState(0);

  // SHOP & UPGRADES
  const [isShopOpen, setIsShopOpen] = useState(false);
  const [modalTab, setModalTab] = useState("upgrades");
  const [multiTapLevel, setMultiTapLevel] = useState(1);
  const [energyLevel, setEnergyLevel] = useState(1);
  const [passiveLevel, setPassiveLevel] = useState(0); 
  const [completedTasks, setCompletedTasks] = useState([]);

  const lastTap = useRef(Date.now());
  const audioRef = useRef(null); // Ref untuk audio
  const MAX_ENERGY = 100 + (energyLevel - 1) * 50; 

  const isWrongNetwork = account && chainId !== HARDHAT_CHAIN_ID;

  // Init Audio
  useEffect(() => {
    audioRef.current = new Audio("/tap3.mp3");
  }, []);

  // LEAGUE SYSTEM
  const getLeague = () => {
    const score = balance + (totalPointsFromClicks / 5);
    if (score > 5000) return { name: "Diamond", color: "text-cyan-400", icon: <Star size={14}/> };
    if (score > 1500) return { name: "Platinum", color: "text-purple-400", icon: <Trophy size={14}/> };
    if (score > 400) return { name: "Gold", color: "text-yellow-400", icon: <Flame size={14}/> };
    return { name: "Bronze", color: "text-slate-400", icon: <Pickaxe size={14}/> };
  };

  // PERSISTENCE: LOAD DATA (Termasuk Taps & Energy agar tidak reset)
  useEffect(() => {
    const savedData = localStorage.getItem("alex_tap_save_v4");
    if (savedData) {
      const parsed = JSON.parse(savedData);
      setMultiTapLevel(parsed.multiTapLevel || 1);
      setEnergyLevel(parsed.energyLevel || 1);
      setPassiveLevel(parsed.passiveLevel || 0);
      setCompletedTasks(parsed.completedTasks || []);
      setTotalPointsFromClicks(parsed.totalPointsFromClicks || 0);
      setTxHistory(parsed.txHistory || []);
      setTaps(parsed.taps || 0); // Load taps
      setEnergy(parsed.energy !== undefined ? parsed.energy : 100); // Load energy
      setBalance(parsed.balance || 0); // Load off-chain balance display
    }
  }, []);

  // PERSISTENCE: SAVE DATA
  useEffect(() => {
    const dataToSave = { 
      multiTapLevel, energyLevel, passiveLevel, 
      completedTasks, totalPointsFromClicks, txHistory,
      taps, energy, balance // Save taps & energy
    };
    localStorage.setItem("alex_tap_save_v4", JSON.stringify(dataToSave));
  }, [multiTapLevel, energyLevel, passiveLevel, completedTasks, totalPointsFromClicks, txHistory, taps, energy, balance]);

  // WALLET LOGIC
  const connectWallet = async () => {
    if (!window.ethereum) return alert("Install MetaMask");
    try {
      const prov = new ethers.BrowserProvider(window.ethereum);
      const network = await prov.getNetwork();
      setChainId("0x" + network.chainId.toString(16));
      
      const signer = await prov.getSigner();
      setProvider(prov);
      setAccount(await signer.getAddress());

      window.ethereum.on('chainChanged', (newId) => setChainId(newId));
    } catch (err) { console.error(err); }
  };

  const switchNetwork = async () => {
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: HARDHAT_CHAIN_ID }] });
    } catch {
      await window.ethereum.request({ method: "wallet_addEthereumChain", params: [HARDHAT_PARAMS] });
    }
  };

  // AUTO SINKRON SALDO & COOLDOWN
  useEffect(() => {
    if (account && provider) {
      loadBalance();
      checkCooldown();
    }
  }, [account, chainId, provider]);

  // ON-CHAIN EVENT LISTENER
  useEffect(() => {
    if (!provider || !account) return;
    const airdrop = new ethers.Contract(AIRDROP_ADDRESS, AIRDROP_ABI, provider);
    
    const onClaimed = (user, amount) => {
      if (user.toLowerCase() === account.toLowerCase()) {
        loadBalance();
        checkCooldown();
      }
    };

    airdrop.on("Claimed", onClaimed);
    return () => airdrop.off("Claimed", onClaimed);
  }, [provider, account]);

  const checkCooldown = async () => {
    if (!provider || !account) return;
    try {
      const contract = new ethers.Contract(AIRDROP_ADDRESS, AIRDROP_ABI, provider);
      const last = await contract.lastClaim(account);
      const now = Math.floor(Date.now() / 1000);
      const diff = Number(last) + 86400 - now; 
      setCooldown(diff > 0 ? diff : 0);
    } catch (err) { console.error("Cooldown Check Error:", err); }
  };

  useEffect(() => {
    const energyTimer = setInterval(() => setEnergy(e => Math.min(e + 1, MAX_ENERGY)), 1500);
    const passiveTimer = setInterval(() => {
      if (passiveLevel > 0) setTaps(prev => prev + passiveLevel);
    }, 1000);
    return () => { clearInterval(energyTimer); clearInterval(passiveTimer); };
  }, [MAX_ENERGY, passiveLevel]);

  const handleTap = (e) => {
    if (!account || isWrongNetwork || energy <= 0 || isShopOpen) return;
    
    // Play Sound
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }

    const now = Date.now();
    const diff = now - lastTap.current;
    lastTap.current = now;

    const newCombo = diff < 400 ? Math.min(combo + 0.1, 5.0) : 1.0;
    setCombo(parseFloat(newCombo.toFixed(1)));
    
    const power = Math.floor(multiTapLevel * newCombo);
    
    setEnergy(e => Math.max(0, e - 1));
    setTaps(t => t + power);
    setTotalPointsFromClicks(prev => prev + power); 

    setFloatings(f => [...f, { id: Date.now(), x: e.clientX, y: e.clientY, text: `+${power}` }]);
  };

  const loadBalance = async () => {
    if (!provider || !account) return;
    try {
      const c = new ethers.Contract(ALEXCOIN_ADDRESS, ALEX_ABI, provider);
      const bal = await c.balanceOf(account);
      setBalance(parseFloat(ethers.formatUnits(bal, 18)));
    } catch (err) { console.error(err); }
  };

  const claim = async () => {
    if (taps < 100) return alert("Anti-Bot: Minimal 100 Taps untuk claim!");
    if (isWrongNetwork) return switchNetwork();
    if (cooldown > 0) return alert(`Wait for cooldown: ${Math.ceil(cooldown/3600)}h left`);
    
    try {
      setClaiming(true);
      const signer = await provider.getSigner();
      const airdrop = new ethers.Contract(AIRDROP_ADDRESS, AIRDROP_ABI, signer);
      
      const tx = await airdrop.claim(ethers.parseUnits(taps.toString(), 18));
      
      const pendingTx = {
        hash: tx.hash,
        from: account,
        amount: taps,
        timestamp: new Date().toLocaleString(),
        status: "Pending",
        id: Date.now()
      };
      
      setLastTx(pendingTx);
      setTxHistory(prev => [pendingTx, ...prev]);

      const receipt = await tx.wait();
      
      const confirmedData = { 
        status: "Confirmed", 
        block: receipt.blockNumber, 
        gas: receipt.gasUsed.toString() 
      };

      setLastTx(prev => ({ ...prev, ...confirmedData }));
      setTxHistory(prev => prev.map(item => 
        item.hash === tx.hash ? { ...item, ...confirmedData } : item
      ));

      setTaps(0);
      confetti({ particleCount: 200, spread: 90 });
      setShowTxDetail(true);
      loadBalance();
    } catch (err) { 
      console.error("Revert Reason:", err.reason || err.message);
      alert(`Transaction Failed: ${err.reason || "User Denied"}`);
    } finally { 
      setClaiming(false); 
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#020617] text-slate-100 flex flex-col items-center justify-between p-4 overflow-hidden" onClick={handleTap}>
      
      {/* WRONG NETWORK BANNER */}
      <AnimatePresence>
        {isWrongNetwork && (
          <motion.div initial={{ y: -100 }} animate={{ y: 0 }} exit={{ y: -100 }} className="fixed top-0 left-0 right-0 z-[100] bg-red-600 p-3 flex justify-center items-center gap-3 font-black text-sm shadow-2xl">
            <AlertTriangle size={18} />
            WRONG NETWORK – SWITCH TO HARDHAT
            <button onClick={switchNetwork} className="bg-white text-red-600 px-4 py-1 rounded-full text-xs">SWITCH</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP STATUS BAR */}
      <div className="w-full max-w-md z-20 space-y-3">
        <div className="flex justify-between items-center bg-white/5 backdrop-blur-xl p-3 rounded-3xl border border-white/10 shadow-2xl">
          <div className="flex items-center gap-3">
             <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <Pickaxe size={20} className="text-white" />
                </div>
                <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-[#020617] rounded-full ${account ? 'bg-green-500' : 'bg-red-500'}`} />
             </div>
             <div>
                <div className="flex items-center gap-1 font-bold text-xs">
                  {getLeague().icon}
                  <span className={getLeague().color}>{getLeague().name} League</span>
                </div>
                <p className="text-[10px] text-slate-500 font-mono">{account ? `${account.slice(0,6)}...${account.slice(-4)}` : "Not Connected"}</p>
             </div>
          </div>

          <div className="flex items-center gap-2">
            {!account ? (
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={(e) => { e.stopPropagation(); connectWallet(); }} className="bg-white text-black px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2">
                <Wallet size={14} /> CONNECT
              </motion.button>
            ) : (
              <>
                <button 
                  onClick={(e) => { e.stopPropagation(); setModalTab("history"); setIsShopOpen(true); }}
                  className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors"
                >
                  <History size={18} className="text-indigo-400" />
                </button>
                <div className="text-right px-2 border-l border-white/10">
                  <span className="text-[10px] text-slate-400 block uppercase font-black">Profit/Sec</span>
                  <span className="text-green-400 font-black text-sm">+{passiveLevel}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* MAIN GAME CIRCLE */}
      <div className="relative flex flex-col items-center justify-center py-10">
        <div className="absolute w-80 h-80 bg-indigo-600/20 blur-[120px] rounded-full animate-pulse" />
        <div className="relative z-10 group">
          <motion.div className="relative" whileTap={{ scale: 0.9, rotate: 2 }}>
            <img src="/hamster.png" className="w-64 h-64 md:w-80 md:h-80 object-contain drop-shadow-[0_0_50px_rgba(99,102,241,0.3)] pointer-events-none select-none" alt="Main" />
            <AnimatePresence>
              <motion.div key={taps} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="absolute -top-12 left-0 right-0 text-center">
                 <span className="text-7xl font-black text-white italic drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]">{taps}</span>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-6 w-full">
            <div className="flex items-center gap-4">
               <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/5 flex items-center gap-2 shadow-xl">
                 <Flame className="text-orange-500" size={18} />
                 <span className="text-orange-500 font-black italic">X{combo} COMBO</span>
               </div>
               {cooldown > 0 && (
                 <div className="bg-orange-500/20 text-orange-400 px-3 py-2 rounded-2xl border border-orange-500/20 text-[10px] font-black flex items-center gap-1">
                   <Calendar size={12}/> COOLDOWN: {Math.floor(cooldown/3600)}h
                 </div>
               )}
            </div>
            {/* ENERGY BAR */}
            <div className="w-64 h-4 bg-white/5 rounded-full border border-white/10 overflow-hidden">
               <motion.div 
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" 
                initial={false}
                animate={{ width: `${(energy / MAX_ENERGY) * 100}%` }}
               />
            </div>
            <span className="text-[10px] font-black text-slate-500">ENERGY: {energy} / {MAX_ENERGY}</span>
        </div>
      </div>

      {/* FOOTER ACTION */}
      <div className="w-full max-w-md space-y-4 pb-4">
        <div className="flex justify-around bg-white/5 backdrop-blur-md py-3 rounded-2xl border border-white/5 relative overflow-hidden">
            <div className="text-center">
              <span className="text-[9px] text-slate-500 block font-black uppercase flex items-center justify-center gap-1">
                <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full" /> Off-chain Game Points
              </span>
              <div className="flex items-center gap-1 justify-center text-indigo-400 font-black">
                 <BarChart3 size={12} /> {totalPointsFromClicks.toLocaleString()}
              </div>
            </div>
            <div className="w-[1px] bg-white/10" />
            <div className="text-center">
              <span className="text-[9px] text-slate-500 block font-black uppercase flex items-center justify-center gap-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" /> On-chain Balance
              </span>
              <div className="flex items-center gap-1 justify-center text-yellow-500 font-black">
                 <Coins size={12} /> {balance.toLocaleString()}
              </div>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <motion.button whileTap={{ scale: 0.95 }} onClick={(e) => { e.stopPropagation(); claim(); }} disabled={taps < 100 || claiming || isWrongNetwork || cooldown > 0} className="h-16 bg-white text-slate-950 rounded-3xl font-black text-lg flex flex-col items-center justify-center shadow-[0_10px_40px_rgba(255,255,255,0.15)] disabled:opacity-20 transition-all">
            <div className="flex items-center gap-2">
              {claiming ? <Cpu className="animate-spin" /> : <Send size={20} />} 
              {claiming ? "SYNCING..." : "CLAIM"}
            </div>
            {taps < 100 && taps > 0 && <span className="text-[8px] uppercase">Min. 100 to claim</span>}
          </motion.button>
          
          <motion.button whileTap={{ scale: 0.95 }} onClick={(e) => { e.stopPropagation(); setModalTab("upgrades"); setIsShopOpen(true); }} className="h-16 bg-slate-900 border border-white/10 text-white rounded-3xl font-black text-lg flex items-center justify-center gap-3 hover:bg-slate-800">
            <ShoppingBag size={24} /> UPGRADES
          </motion.button>
        </div>
      </div>

      {/* TRANSACTION DETAIL MODAL */}
      <AnimatePresence>
        {showTxDetail && lastTx && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setShowTxDetail(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-slate-900 border border-white/10 w-full max-w-sm rounded-[2.5rem] p-6 space-y-6" onClick={e => e.stopPropagation()}>
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck size={40} />
                </div>
                <h3 className="text-2xl font-black italic">TRANSACTION VERIFIED</h3>
                <p className="text-xs text-slate-400 font-mono">Evidence recorded on Blockchain</p>
              </div>

              <div className="space-y-3 font-mono text-[10px]">
                <div className="bg-white/5 p-3 rounded-2xl border border-white/5 space-y-2">
                   <div className="flex justify-between text-slate-400"><span>TX HASH:</span> <span className="text-indigo-400">{lastTx.hash.slice(0,14)}...</span></div>
                   <div className="flex justify-between text-slate-400"><span>BLOCK:</span> <span className="text-white">{lastTx.block || "Confirming..."}</span></div>
                   <div className="flex justify-between text-slate-400"><span>STATUS:</span> <span className="text-green-400 font-black">{lastTx.status}</span></div>
                </div>
              </div>

              <button onClick={() => setShowTxDetail(false)} className="w-full bg-white text-black py-4 rounded-2xl font-black text-sm uppercase tracking-tighter">
                Dismiss Evidence
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SHOP & HISTORY MODAL */}
      <AnimatePresence>
        {isShopOpen && (
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25 }} className="fixed inset-0 z-50 flex flex-col bg-[#020617] p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
               <h2 className="text-3xl font-black tracking-tighter italic">MINE CENTER</h2>
               <button onClick={() => setIsShopOpen(false)} className="p-3 bg-white/5 rounded-full"><X /></button>
            </div>

            <div className="flex p-1 bg-white/5 rounded-2xl mb-6">
               <button onClick={() => setModalTab("upgrades")} className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${modalTab === "upgrades" ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>UPGRADES</button>
               <button onClick={() => setModalTab("tasks")} className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${modalTab === "tasks" ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>TASKS</button>
               <button onClick={() => setModalTab("history")} className={`flex-1 py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1 ${modalTab === "history" ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}><History size={14}/> HISTORY</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
               {modalTab === "upgrades" && (
                 <>
                   <UpgradeItem icon={<MousePointer2 />} title="Multi-Tap" level={multiTapLevel} cost={multiTapLevel * 20} desc="+1 Tap Power" onBuy={() => {
                      if (balance >= multiTapLevel * 20) {
                        setBalance(b => b - multiTapLevel * 20);
                        setMultiTapLevel(l => l + 1);
                        confetti({ particleCount: 30 });
                      } else alert("Not enough ALEX!");
                   }} />
                   <UpgradeItem icon={<Zap />} title="Energy Boost" level={energyLevel} cost={energyLevel * 30} desc="+50 Max Energy" onBuy={() => {
                      if (balance >= energyLevel * 30) {
                        setBalance(b => b - energyLevel * 30);
                        setEnergyLevel(l => l + 1);
                        confetti({ particleCount: 30 });
                      } else alert("Not enough ALEX!");
                   }} />
                   <UpgradeItem icon={<Cpu />} title="Auto Miner" level={passiveLevel} cost={(passiveLevel + 1) * 100} desc="+1 ALEX / sec" onBuy={() => {
                      const cost = (passiveLevel + 1) * 100;
                      if (balance >= cost) {
                        setBalance(b => b - cost);
                        setPassiveLevel(l => l + 1);
                        confetti({ particleCount: 30 });
                      } else alert("Not enough ALEX!");
                   }} />
                 </>
               )}

               {modalTab === "tasks" && (
                 <>
                    <TaskItem icon={<Twitter className="text-sky-400"/>} title="Follow Twitter" reward={50} id="twitter" done={completedTasks.includes('twitter')} onClaim={() => {
                      setBalance(b => b + 50);
                      setCompletedTasks([...completedTasks, 'twitter']);
                      confetti({ particleCount: 50 });
                    }} />
                    <TaskItem icon={<Send className="text-indigo-400"/>} title="Join Telegram" reward={100} id="tg" done={completedTasks.includes('tg')} onClaim={() => {
                      setBalance(b => b + 100);
                      setCompletedTasks([...completedTasks, 'tg']);
                      confetti({ particleCount: 50 });
                    }} />
                 </>
               )}

               {modalTab === "history" && (
                 <div className="space-y-3">
                   {txHistory.length === 0 ? (
                     <div className="text-center py-20 opacity-30 font-black">NO TRANSACTIONS YET</div>
                   ) : (
                     txHistory.map(tx => (
                       <div key={tx.id} className="bg-white/5 p-4 rounded-3xl border border-white/5 space-y-2">
                         <div className="flex justify-between items-start">
                           <div>
                             <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${tx.status === 'Confirmed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                               {tx.status.toUpperCase()}
                             </span>
                             <h4 className="font-black text-sm mt-1">{tx.amount.toLocaleString()} ALEX</h4>
                           </div>
                           <span className="text-[10px] text-slate-500 font-mono">{tx.timestamp}</span>
                         </div>
                         <div className="pt-2 border-t border-white/5 font-mono text-[9px] text-slate-400 space-y-1">
                           <div className="flex justify-between"><span>HASH:</span> <span className="text-indigo-400">{tx.hash.slice(0,20)}...</span></div>
                           {tx.block && <div className="flex justify-between"><span>BLOCK:</span> <span>{tx.block}</span></div>}
                           {tx.gas && <div className="flex justify-between"><span>GAS USED:</span> <span>{tx.gas}</span></div>}
                         </div>
                       </div>
                     ))
                   )}
                 </div>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* FLOATING TEXT */}
      <AnimatePresence>
        {floatings.map(f => (
          <motion.div key={f.id} initial={{ opacity: 1, y: 0, scale: 0.5 }} animate={{ opacity: 0, y: -120, scale: 1.2, rotate: Math.random() * 20 - 10 }} exit={{ opacity: 0 }} style={{ left: f.x - 20, top: f.y - 40 }} className="fixed pointer-events-none text-3xl font-black text-white z-[60] select-none drop-shadow-xl">
            {f.text}
          </motion.div>
        ))}
      </AnimatePresence>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
}

// --- SUBCOMPONENTS ---
function UpgradeItem({ icon, title, level, cost, desc, onBuy }) {
  return (
    <div className="bg-white/5 p-4 rounded-[2rem] border border-white/5 flex items-center justify-between hover:bg-white/10 transition-all group">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">{icon}</div>
        <div>
          <h4 className="font-black text-sm">{title}</h4>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{desc}</p>
          <div className="text-[10px] mt-1 bg-indigo-500/20 text-indigo-300 w-fit px-2 rounded-md font-bold">LVL {level}</div>
        </div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onBuy(); }} className="bg-white text-black px-4 py-2 rounded-xl font-black text-xs flex items-center gap-1 shadow-lg active:scale-90 transition-transform">
        <Coins size={12} /> {cost}
      </button>
    </div>
  );
}

function TaskItem({ icon, title, reward, id, done, onClaim }) {
  return (
    <div className="bg-white/5 p-4 rounded-[2rem] border border-white/5 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">{icon}</div>
        <div>
          <h4 className="font-black text-sm">{title}</h4>
          <p className="text-xs font-bold text-green-400">+{reward} ALEX</p>
        </div>
      </div>
      <button disabled={done} onClick={(e) => { e.stopPropagation(); onClaim(); }} className={`px-5 py-2 rounded-xl font-black text-xs transition-all ${done ? 'bg-slate-800 text-slate-500' : 'bg-indigo-600 text-white shadow-lg active:scale-95'}`}>
        {done ? "DONE" : "CLAIM"}
      </button>
    </div>
  );
}
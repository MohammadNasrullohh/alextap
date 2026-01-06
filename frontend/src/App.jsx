import { useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { 
  Wallet, Zap, ShoppingBag, Pickaxe, MousePointer2, X, 
  Twitter, Send, Calendar, Coins, ArrowBigUpDash, Cpu,
  Trophy, Flame, Rocket, Star, BarChart3, AlertTriangle, CheckCircle2, ShieldCheck, ExternalLink, Info, History, ArrowRightLeft, Users
} from "lucide-react";

const SEPOLIA_CHAIN_ID = "0xaa36a7"; 
const SEPOLIA_PARAMS = {
  chainId: SEPOLIA_CHAIN_ID,
  chainName: "Sepolia Test Network",
  rpcUrls: ["https://rpc.ankr.com/eth_sepolia"],
  nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
  blockExplorerUrls: ["https://sepolia.etherscan.io"]
};

const ALEXCOIN_ADDRESS = "0x1e49Eddc63c3D445ae3f7Cb0965Eb82FF97d4121"; 
const AIRDROP_ADDRESS = "0x3cC2A22842C7E3F901E20424e48e5645D0C9f205";

const ALEX_ABI = ["function balanceOf(address) view returns (uint256)"];
const AIRDROP_ABI = [
  "function claim(uint256 amount) external",
  "function fund(uint256 amount) external",
  "function lastClaim(address) view returns (uint256)",
  "event Claimed(address indexed user, uint256 amount)"
];

const CONVERSION_RATE = 100; 

const INITIAL_LEADERBOARD = [
  { address: "0x71C...821a", points: 150000, league: "Diamond" },
  { address: "0x3A2...f92b", points: 85000, league: "Diamond" },
  { address: "0x91D...441c", points: 42000, league: "Platinum" },
  { address: "0xE21...110d", points: 12000, league: "Gold" },
];

export default function App() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [balance, setBalance] = useState(0); 
  const [claiming, setClaiming] = useState(false);
  const [chainId, setChainId] = useState(null);
  const [lastTx, setLastTx] = useState(null);
  const [showTxDetail, setShowTxDetail] = useState(false);
  const [txHistory, setTxHistory] = useState([]);

  const [taps, setTaps] = useState(0);
  const [totalPointsFromClicks, setTotalPointsFromClicks] = useState(0);
  const [combo, setCombo] = useState(1);
  const [energy, setEnergy] = useState(100);
  const [floatings, setFloatings] = useState([]);
  const [cooldown, setCooldown] = useState(0);

  const [isShopOpen, setIsShopOpen] = useState(false);
  const [modalTab, setModalTab] = useState("upgrades");
  const [multiTapLevel, setMultiTapLevel] = useState(1);
  const [energyLevel, setEnergyLevel] = useState(1);
  const [passiveLevel, setPassiveLevel] = useState(0); 
  const [completedTasks, setCompletedTasks] = useState([]);

  const lastTap = useRef(Date.now());
  const audioRef = useRef(null); 
  const MAX_ENERGY = 100 + (energyLevel - 1) * 50; 

  const isWrongNetwork = account && chainId !== SEPOLIA_CHAIN_ID;
  const estimatedClaim = (taps / CONVERSION_RATE).toFixed(2);

  const getDynamicLeaderboard = () => {
    const playerEntry = { 
      address: account ? `${account.slice(0,6)}...${account.slice(-4)} (You)` : "You", 
      points: totalPointsFromClicks, 
      league: getLeague(totalPointsFromClicks).name 
    };
    return [...INITIAL_LEADERBOARD, playerEntry].sort((a, b) => b.points - a.points);
  };

  const getLeague = (points = totalPointsFromClicks) => {
    if (points > 100000) return { name: "Diamond", color: "text-cyan-400", icon: <Star size={14}/> };
    if (points > 40000) return { name: "Platinum", color: "text-purple-400", icon: <Trophy size={14}/> };
    if (points > 10000) return { name: "Gold", color: "text-yellow-400", icon: <Flame size={14}/> };
    return { name: "Bronze", color: "text-slate-400", icon: <Pickaxe size={14}/> };
  };

  useEffect(() => {
    audioRef.current = new Audio("/tap3.mp3");
    const savedData = localStorage.getItem("alex_tap_save_v6");
    if (savedData) {
      const parsed = JSON.parse(savedData);
      setMultiTapLevel(parsed.multiTapLevel || 1);
      setEnergyLevel(parsed.energyLevel || 1);
      setPassiveLevel(parsed.passiveLevel || 0);
      setCompletedTasks(parsed.completedTasks || []);
      setTotalPointsFromClicks(parsed.totalPointsFromClicks || 0);
      setTxHistory(parsed.txHistory || []);
      setTaps(parsed.taps || 0); 
      setEnergy(parsed.energy !== undefined ? parsed.energy : 100); 
    }
  }, []);

  useEffect(() => {
    const dataToSave = { 
      multiTapLevel, energyLevel, passiveLevel, 
      completedTasks, totalPointsFromClicks, txHistory,
      taps, energy
    };
    localStorage.setItem("alex_tap_save_v6", JSON.stringify(dataToSave));
  }, [multiTapLevel, energyLevel, passiveLevel, completedTasks, totalPointsFromClicks, txHistory, taps, energy]);

  const connectWallet = async () => {
    if (!window.ethereum) return alert("Install MetaMask");
    try {
      const prov = new ethers.BrowserProvider(window.ethereum);
      const network = await prov.getNetwork();
      const currentChainId = "0x" + network.chainId.toString(16);
      
      const signer = await prov.getSigner();
      const addr = await signer.getAddress();
      
      setProvider(prov);
      setAccount(addr);
      setChainId(currentChainId);

      window.ethereum.on('chainChanged', (newId) => {
        setChainId(newId);
        window.location.reload();
      });

      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          loadBalance();
        } else {
          window.location.reload();
        }
      });

    } catch (err) { console.error(err); }
  };

  const switchNetwork = async () => {
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SEPOLIA_CHAIN_ID }] });
    } catch (error) {
      if (error.code === 4902) {
        await window.ethereum.request({ method: "wallet_addEthereumChain", params: [SEPOLIA_PARAMS] });
      }
    }
  };

  useEffect(() => {
    if (account && chainId === SEPOLIA_CHAIN_ID) {
      loadBalance();
      const interval = setInterval(loadBalance, 8000); 
      checkCooldown();
      return () => clearInterval(interval);
    }
  }, [account, chainId]);

  const loadBalance = async () => {
    if (!window.ethereum || !account) return;
    try {
      const currentProv = new ethers.BrowserProvider(window.ethereum);
      const c = new ethers.Contract(ALEXCOIN_ADDRESS, ALEX_ABI, currentProv);
      const bal = await c.balanceOf(account);
      const formattedBal = parseFloat(ethers.formatUnits(bal, 18));
      setBalance(formattedBal);
    } catch (err) { 
        console.warn("Sync Balance Failed"); 
    }
  };

  const checkCooldown = async () => {
    if (!window.ethereum || !account || isWrongNetwork) return;
    try {
      const currentProv = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(AIRDROP_ADDRESS, AIRDROP_ABI, currentProv);
      const last = await contract.lastClaim(account);
      const now = Math.floor(Date.now() / 1000);
      const diff = Number(last) + 86400 - now; 
      setCooldown(diff > 0 ? diff : 0);
    } catch (err) { console.error("Cooldown Check Error:", err); }
  };

  useEffect(() => {
    const energyTimer = setInterval(() => setEnergy(e => Math.min(e + 1, MAX_ENERGY)), 1500);
    const passiveTimer = setInterval(() => {
      if (passiveLevel > 0) {
          setTaps(prev => prev + passiveLevel);
          setTotalPointsFromClicks(prev => prev + passiveLevel);
      }
    }, 1000);
    return () => { clearInterval(energyTimer); clearInterval(passiveTimer); };
  }, [MAX_ENERGY, passiveLevel]);

  const handleTap = (e) => {
    if (!account || isWrongNetwork || energy <= 0 || isShopOpen) return;
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

  const claim = async () => {
    if (taps < 100) return alert("Minimal 100 Taps untuk claim!");
    if (isWrongNetwork) return switchNetwork();
    if (cooldown > 0) return alert(`Wait for cooldown: ${Math.ceil(cooldown/3600)}h left`);
    
    try {
      setClaiming(true);
      const currentProv = new ethers.BrowserProvider(window.ethereum);
      const signer = await currentProv.getSigner();
      
      const airdrop = new ethers.Contract(AIRDROP_ADDRESS, AIRDROP_ABI, signer);
      const claimAmount = Math.floor(taps / CONVERSION_RATE);
      const claimAmountWei = ethers.parseUnits(claimAmount.toString(), 18);

      const tx = await airdrop.claim(claimAmountWei);
      
      const pendingTx = {
        hash: tx.hash,
        from: account,
        amount: claimAmount,
        timestamp: new Date().toLocaleString(),
        status: "Pending",
        id: Date.now()
      };
      setLastTx(pendingTx);
      setTxHistory(prev => [pendingTx, ...prev]);

      await tx.wait(); 
      
      setTaps(0);
      confetti({ particleCount: 200, spread: 90 });
      setShowTxDetail(true);
      
      await loadBalance();
      await checkCooldown();
      
    } catch (err) { 
      console.error("Claim Error:", err);
      const errorMsg = err.reason || err.message || "User Denied";
      alert(`Transaction Failed: ${errorMsg}`);
    } finally { setClaiming(false); }
  };

  return (
    <div className="min-h-screen w-screen bg-[#020617] text-slate-100 flex flex-col items-center justify-between p-4 overflow-hidden" onClick={handleTap}>
      
      <AnimatePresence>
        {isWrongNetwork && (
          <motion.div initial={{ y: -100 }} animate={{ y: 0 }} exit={{ y: -100 }} className="fixed top-0 left-0 right-0 z-[100] bg-orange-600 p-3 flex justify-center items-center gap-3 font-black text-sm shadow-2xl">
            <AlertTriangle size={18} />
            SWITCH TO SEPOLIA NETWORK
            <button onClick={switchNetwork} className="bg-white text-orange-600 px-4 py-1 rounded-full text-xs">SWITCH</button>
          </motion.div>
        )}
      </AnimatePresence>

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

          <div className="flex items-center gap-1.5">
            {!account ? (
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={(e) => { e.stopPropagation(); connectWallet(); }} className="bg-white text-black px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2">
                <Wallet size={14} /> CONNECT
              </motion.button>
            ) : (
              <>
                <button 
                  onClick={(e) => { e.stopPropagation(); setModalTab("leaderboard"); setIsShopOpen(true); }}
                  className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors"
                >
                  <Trophy size={18} className="text-yellow-400" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setModalTab("history"); setIsShopOpen(true); }}
                  className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors"
                >
                  <History size={18} className="text-indigo-400" />
                </button>
                <div className="text-right px-2 border-l border-white/10">
                  <span className="text-[10px] text-slate-400 block uppercase font-black leading-none">P/S</span>
                  <span className="text-green-400 font-black text-sm">+{passiveLevel}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

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
                    <Calendar size={12}/> {Math.floor(cooldown/3600)}h LEFT
                  </div>
                )}
            </div>
            <div className="w-64 h-4 bg-white/5 rounded-full border border-white/10 overflow-hidden">
                <motion.div 
                 className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" 
                 initial={false}
                 animate={{ width: `${(energy / MAX_ENERGY) * 100}%` }}
                />
            </div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ENERGY: {energy} / {MAX_ENERGY}</span>
        </div>
      </div>

      <div className="w-full max-w-md space-y-4 pb-4">
        <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <ArrowRightLeft size={16} />
                </div>
                <div>
                    <p className="text-[9px] font-black text-indigo-300 uppercase leading-none">Exchange Rate</p>
                    <p className="text-[11px] text-slate-400 font-mono italic">{CONVERSION_RATE} Taps = 1 ALEX</p>
                </div>
            </div>
            <div className="text-right">
                <p className="text-[9px] font-black text-slate-500 uppercase leading-none">Est. Receive</p>
                <p className="text-sm font-black text-green-400">{estimatedClaim} ALEX</p>
            </div>
        </div>

        <div className="flex justify-around bg-white/5 backdrop-blur-md py-3 rounded-2xl border border-white/5">
            <div className="text-center">
              <span className="text-[9px] text-slate-500 block font-black uppercase flex items-center justify-center gap-1">
                <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full" /> Total Taps
              </span>
              <div className="flex items-center gap-1 justify-center text-indigo-400 font-black">
                 <BarChart3 size={12} /> {totalPointsFromClicks.toLocaleString()}
              </div>
            </div>
            <div className="w-[1px] bg-white/10" />
            <div className="text-center">
              <span className="text-[9px] text-slate-500 block font-black uppercase flex items-center justify-center gap-1">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" /> Wallet Balance
              </span>
              <div className="flex items-center gap-1 justify-center text-yellow-500 font-black">
                 <Coins size={12} /> {balance.toFixed(2)}
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

      <AnimatePresence>
        {showTxDetail && lastTx && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setShowTxDetail(false)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-slate-900 border border-white/10 w-full max-w-sm rounded-[2.5rem] p-6 space-y-6" onClick={e => e.stopPropagation()}>
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck size={40} />
                </div>
                <h3 className="text-2xl font-black italic">TX SUCCESSFUL</h3>
                <p className="text-xs text-slate-400 font-mono">Verified on Sepolia Network</p>
              </div>
              <div className="space-y-3 font-mono text-[10px]">
                <div className="bg-white/5 p-3 rounded-2xl border border-white/5 space-y-2">
                   <div className="flex justify-between text-slate-400"><span>TX HASH:</span> <span className="text-indigo-400">{lastTx.hash.slice(0,14)}...</span></div>
                   <div className="flex justify-between text-slate-400"><span>STATUS:</span> <span className="text-green-400 font-black">Confirmed</span></div>
                </div>
              </div>
              <button onClick={() => setShowTxDetail(false)} className="w-full bg-white text-black py-4 rounded-2xl font-black text-sm uppercase tracking-tighter">
                Awesome!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isShopOpen && (
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25 }} className="fixed inset-0 z-50 flex flex-col bg-[#020617] p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
               <h2 className="text-3xl font-black tracking-tighter italic uppercase">{modalTab}</h2>
               <button onClick={() => setIsShopOpen(false)} className="p-3 bg-white/5 rounded-full"><X /></button>
            </div>

            <div className="flex p-1 bg-white/5 rounded-2xl mb-6 overflow-x-auto no-scrollbar">
               {["upgrades", "tasks", "leaderboard", "history"].map(tab => (
                 <button key={tab} onClick={() => setModalTab(tab)} className={`flex-1 min-w-[80px] py-3 rounded-xl font-black text-[10px] transition-all uppercase ${modalTab === tab ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>{tab}</button>
               ))}
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
               {modalTab === "upgrades" && (
                 <>
                   <UpgradeItem icon={<MousePointer2 />} title="Multi-Tap" level={multiTapLevel} cost={multiTapLevel * 20} desc="+1 Tap Power" onBuy={() => {
                      if (balance >= multiTapLevel * 20) {
                        setBalance(b => b - multiTapLevel * 20);
                        setMultiTapLevel(l => l + 1);
                        confetti({ particleCount: 30 });
                      } else alert("Not enough ALEX in Wallet!");
                   }} />
                   <UpgradeItem icon={<Zap />} title="Energy Boost" level={energyLevel} cost={energyLevel * 30} desc="+50 Max Energy" onBuy={() => {
                      if (balance >= energyLevel * 30) {
                        setBalance(b => b - energyLevel * 30);
                        setEnergyLevel(l => l + 1);
                        confetti({ particleCount: 30 });
                      } else alert("Not enough ALEX in Wallet!");
                   }} />
                   <UpgradeItem icon={<Cpu />} title="Auto Miner" level={passiveLevel} cost={(passiveLevel + 1) * 100} desc="+1 Taps / sec" onBuy={() => {
                      const cost = (passiveLevel + 1) * 100;
                      if (balance >= cost) {
                        setBalance(b => b - cost);
                        setPassiveLevel(l => l + 1);
                        confetti({ particleCount: 30 });
                      } else alert("Not enough ALEX in Wallet!");
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

               {modalTab === "leaderboard" && (
                 <div className="space-y-3">
                    <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 p-4 rounded-3xl border border-white/10 mb-6">
                        <p className="text-[10px] font-black text-indigo-300 uppercase">Your Performance</p>
                        <div className="flex justify-between items-end mt-2">
                            <h3 className="text-2xl font-black italic">Rank #{getDynamicLeaderboard().findIndex(x => x.address.includes("(You)")) + 1}</h3>
                            <div className="text-right">
                                <p className="text-xs font-bold text-white">{totalPointsFromClicks.toLocaleString()} PTS</p>
                                <p className={`text-[10px] font-bold ${getLeague().color}`}>{getLeague().name} LEAGUE</p>
                            </div>
                        </div>
                    </div>
                    
                    <h4 className="text-[10px] font-black text-slate-500 uppercase px-2">Global Ranking</h4>
                    {getDynamicLeaderboard().map((user, idx) => (
                      <div key={idx} className={`bg-white/5 p-4 rounded-[2rem] border ${user.address.includes("(You)") ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/5'} flex items-center justify-between`}>
                         <div className="flex items-center gap-4">
                            <span className={`text-lg font-black italic ${idx === 0 ? 'text-yellow-400' : 'text-slate-500'}`}>#{idx + 1}</span>
                            <div>
                               <p className="text-sm font-black text-white font-mono">{user.address}</p>
                               <p className="text-[9px] font-bold text-slate-500 uppercase">{user.league} League</p>
                            </div>
                         </div>
                         <div className="text-right">
                            <p className="text-xs font-black text-indigo-400">{user.points.toLocaleString()}</p>
                            <p className="text-[9px] font-bold text-slate-600 uppercase">Points</p>
                         </div>
                      </div>
                    ))}
                 </div>
               )}

               {modalTab === "history" && (
                 <div className="space-y-3">
                   {txHistory.length === 0 ? (
                     <div className="text-center py-20 opacity-30 font-black">NO TRANSACTION DATA</div>
                   ) : (
                     txHistory.map(tx => (
                       <div key={tx.id} className="bg-white/5 p-4 rounded-3xl border border-white/5 space-y-2">
                         <div className="flex justify-between items-start">
                           <div>
                             <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${tx.status === 'Confirmed' || tx.status === 'Pending' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                               {tx.status.toUpperCase()}
                             </span>
                             <h4 className="font-black text-sm mt-1">{tx.amount.toLocaleString()} ALEX</h4>
                           </div>
                           <span className="text-[10px] text-slate-500 font-mono">{tx.timestamp}</span>
                         </div>
                         <div className="pt-2 border-t border-white/5 font-mono text-[9px] text-slate-400 space-y-1">
                           <div className="flex justify-between"><span>HASH:</span> <span className="text-indigo-400">{tx.hash.slice(0,20)}...</span></div>
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
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

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
